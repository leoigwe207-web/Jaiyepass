-- JaiyePass transactional ticket finalization, REVIEW ONLY.
-- NOT APPLIED. Test Paystack success/retry, expired holds, simultaneous orders,
-- refunds, free tickets and existing database triggers in staging first.
BEGIN;
CREATE OR REPLACE FUNCTION public.finalize_paid_order(
 p_order_id uuid, p_reference text, p_channel text DEFAULT NULL, p_pepper text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 o public.orders%ROWTYPE;
 pay public.payments%ROWTYPE;
 item RECORD;
 tt RECORD;
 h RECORD;
 v_ticket uuid;
 v_payload text;
 v_issued integer := 0;
 v_item_count integer := 0;
 v_affected integer;
 i integer;
BEGIN
 IF p_order_id IS NULL OR p_reference IS NULL OR length(p_reference) < 5
    OR p_pepper IS NULL OR length(p_pepper) < 16 THEN
   RAISE EXCEPTION 'Invalid payment parameters';
 END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF o.status IN ('paid','refunded') THEN
   IF o.paystack_reference IS DISTINCT FROM p_reference THEN
     RAISE EXCEPTION 'Duplicate callback for different reference';
   END IF;
   RETURN jsonb_build_object('status','already_finalized','order_id',o.id);
 END IF;
 IF o.status NOT IN ('pending','awaiting_payment') THEN
   RAISE EXCEPTION 'Order is not payable';
 END IF;
 IF o.total_kobo=0 THEN
   IF o.status <> 'pending' OR
      p_reference <> ('free-' || left(replace(o.id::text, '-', ''),16)) THEN
     RAISE EXCEPTION 'Invalid free order reference';
   END IF;
 ELSIF o.status <> 'awaiting_payment' OR
       o.paystack_reference IS DISTINCT FROM p_reference THEN
   RAISE EXCEPTION 'Payment reference mismatch';
 END IF;
 SELECT * INTO pay FROM public.payments
  WHERE reference=p_reference AND order_id=o.id FOR UPDATE;
 IF NOT FOUND OR pay.amount_kobo <> o.total_kobo
    OR pay.currency <> o.currency THEN
   RAISE EXCEPTION 'No matching payment record';
 END IF;

 -- Serialize stock updates by ticket tier and require every active hold.
 FOR item IN SELECT * FROM public.order_items
             WHERE order_id=o.id ORDER BY ticket_type_id
 LOOP
   v_item_count := v_item_count+1;
   SELECT id, quantity, sold_count INTO tt FROM public.ticket_types
      WHERE id=item.ticket_type_id FOR UPDATE;
   IF NOT FOUND OR tt.sold_count + item.quantity > tt.quantity THEN
     RAISE EXCEPTION 'Ticket inventory cannot be fulfilled';
   END IF;
   SELECT id, quantity, status, expires_at INTO h FROM public.inventory_holds
    WHERE order_id=o.id AND ticket_type_id=item.ticket_type_id FOR UPDATE;
   IF NOT FOUND OR h.status <> 'active' OR h.expires_at <= now()
      OR h.quantity <> item.quantity THEN
     RAISE EXCEPTION 'Hold expired; payment requires manual reconciliation';
   END IF;
 END LOOP;
 IF v_item_count=0 THEN RAISE EXCEPTION 'Order has no ticket items'; END IF;

 UPDATE public.inventory_holds SET status='consumed', updated_at=now()
   WHERE order_id=o.id AND status='active';
 GET DIAGNOSTICS v_affected=ROW_COUNT;
 IF v_affected<>v_item_count THEN RAISE EXCEPTION 'Missing tier holds'; END IF;
 FOR item IN SELECT * FROM public.order_items WHERE order_id=o.id LOOP
   UPDATE public.ticket_types
     SET sold_count=sold_count+item.quantity, updated_at=now()
     WHERE id=item.ticket_type_id AND sold_count+item.quantity<=quantity;
   GET DIAGNOSTICS v_affected=ROW_COUNT;
   IF v_affected<>1 THEN RAISE EXCEPTION 'Concurrent stock conflict'; END IF;
   FOR i IN 1..item.quantity LOOP
     v_ticket:=gen_random_uuid();
     v_payload:=v_ticket::text || '.' ||
       encode(extensions.hmac(v_ticket::text,p_pepper,'sha256'),'hex');
     INSERT INTO public.tickets
       (id,order_id,ticket_type_id,event_id,user_id,token_hash)
     VALUES (v_ticket,o.id,item.ticket_type_id,o.event_id,o.user_id,
       public.hash_ticket_token(v_payload));
     v_issued:=v_issued+1;
   END LOOP;
 END LOOP;
 UPDATE public.payments SET status='success', verified_at=now(),
   channel=coalesce(p_channel,channel), updated_at=now()
   WHERE id=pay.id;
 UPDATE public.orders SET status='paid', paystack_reference=p_reference,
   updated_at=now(), status_history=coalesce(o.status_history,'[]'::jsonb)
     || jsonb_build_array(jsonb_build_object('to','paid','at',now(),'via','verified_payment'))
   WHERE id=o.id;
 UPDATE public.ticket_types SET status='sold_out',updated_at=now()
   WHERE event_id=o.event_id AND status='active' AND sold_count>=quantity;
 RETURN jsonb_build_object('status','paid','order_id',o.id,'tickets_issued',v_issued);
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_paid_order(uuid,text,text,text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order(uuid,text,text,text) TO service_role;
COMMIT;
