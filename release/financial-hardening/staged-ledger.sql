-- JaiyePass staged organizer-finance ledger (REVIEW FIRST; NOT DEPLOYED).
-- All amounts are signed bigint KOBO. Only reconciled settlements may credit it.
-- This script creates safety infrastructure, but never initiates a bank transfer.
-- REQUIRED: full backup, staging run, review bank verification workflow and fee contracts.
BEGIN;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS payout_account_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.organizer_financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  entry_type text NOT NULL CHECK (entry_type IN (
    'settlement_credit', 'platform_fee', 'processor_fee', 'refund_debit', 'adjustment'
  )),
  amount_kobo bigint NOT NULL CHECK (amount_kobo <> 0),
  currency text NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  source_reference text NOT NULL CHECK (length(source_reference) BETWEEN 4 AND 200),
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  posted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, entry_type, source_reference),
  CONSTRAINT organizer_financial_entry_sign CHECK (
    (entry_type = 'settlement_credit' AND amount_kobo > 0) OR
    (entry_type IN ('platform_fee', 'processor_fee', 'refund_debit') AND amount_kobo < 0) OR
    entry_type = 'adjustment'
  )
);
CREATE INDEX IF NOT EXISTS organizer_financial_entries_org_idx
  ON public.organizer_financial_entries (organization_id, posted_at DESC);
ALTER TABLE public.organizer_financial_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organizer_financial_entries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organizer_financial_entries TO service_role;

-- Financial journal is append-only; reverse errors with a new adjustment.
CREATE OR REPLACE FUNCTION public.block_financial_entry_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Financial journal is append-only; write a compensating entry';
END;
$$;
DROP TRIGGER IF EXISTS organizer_financial_entries_immutable ON public.organizer_financial_entries;
CREATE TRIGGER organizer_financial_entries_immutable
BEFORE UPDATE OR DELETE ON public.organizer_financial_entries
FOR EACH ROW EXECUTE FUNCTION public.block_financial_entry_mutation();
REVOKE ALL ON FUNCTION public.block_financial_entry_mutation() FROM PUBLIC, anon, authenticated;

-- Financial snapshot for the server-side organizer dashboard. Never expose to
-- client roles. Revenue and settlements are distinct by construction.
CREATE OR REPLACE FUNCTION public.get_org_finance_snapshot(p_org_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_gross bigint := 0;
  v_tickets bigint := 0;
  v_checkout_fees bigint := 0;
  v_orders bigint := 0;
  v_refunded bigint := 0;
  v_paid_out bigint := 0;
  v_reserved bigint := 0;
  v_ledger_net bigint := 0;
  v_platform_fee bigint := 0;
  v_processor_fee bigint := 0;
  v_available bigint := 0;
BEGIN
  SELECT COALESCE(SUM(o.total_kobo),0),
         COALESCE(SUM(o.subtotal_kobo - o.discount_kobo),0),
         COALESCE(SUM(o.fee_kobo),0), COUNT(*)
    INTO v_gross,v_tickets,v_checkout_fees,v_orders
    FROM public.orders o
    JOIN public.events e ON e.id = o.event_id
   WHERE e.organization_id = p_org_id AND o.status IN ('paid','refunded');

  SELECT COALESCE(SUM(r.amount_kobo),0) INTO v_refunded
    FROM public.refunds r
    JOIN public.orders o ON o.id=r.order_id
    JOIN public.events e ON e.id=o.event_id
   WHERE e.organization_id=p_org_id AND r.status='processed';

  SELECT COALESCE(SUM(amount_kobo) FILTER (WHERE status='paid'),0),
         COALESCE(SUM(amount_kobo) FILTER
             (WHERE status IN ('pending','approved','processing','on_hold')),0)
    INTO v_paid_out,v_reserved
    FROM public.payouts WHERE organization_id=p_org_id;

  SELECT COALESCE(SUM(amount_kobo),0),
         -COALESCE(SUM(amount_kobo) FILTER (WHERE entry_type='platform_fee'),0),
         -COALESCE(SUM(amount_kobo) FILTER (WHERE entry_type='processor_fee'),0)
    INTO v_ledger_net,v_platform_fee,v_processor_fee
    FROM public.organizer_financial_entries WHERE organization_id=p_org_id;

  v_available := GREATEST(0, v_ledger_net - v_paid_out - v_reserved);
  RETURN jsonb_build_object(
    'gross_kobo', v_gross, 'ticket_revenue_kobo',v_tickets,
    'checkout_fees_kobo',v_checkout_fees,'paid_order_count',v_orders,
    'refunded_kobo',v_refunded,'paid_out_kobo',v_paid_out,
    'reserved_kobo',v_reserved,'settled_net_kobo',GREATEST(0,v_ledger_net - v_paid_out),
    'platform_fees_kobo',v_platform_fee,'processor_fees_kobo',v_processor_fee,
    'available_kobo',v_available);
END;
$$;

-- An atomic payout request holds the organizer row lock for the duration of
-- the balance check and insert. Concurrent requests cannot over-reserve.
CREATE OR REPLACE FUNCTION public.request_organizer_payout(
  p_org_id uuid, p_requester uuid, p_amount_kobo bigint)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_sums jsonb;
  v_amount bigint;
  v_id uuid;
BEGIN
  IF p_amount_kobo < 100 OR p_amount_kobo > 2147483647 OR p_amount_kobo IS NULL THEN
    RAISE EXCEPTION 'Invalid payout amount';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id=p_org_id AND m.user_id=p_requester
    AND m.status='active' AND m.role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Organizer payout permission denied';
  END IF;

  SELECT * INTO v_org FROM public.organizations
  WHERE id=p_org_id FOR UPDATE;
  IF NOT FOUND OR v_org.verification <> 'verified'
    OR v_org.payout_account_verified_at IS NULL
    OR v_org.payout_account_number IS NULL
    OR v_org.payout_bank_name IS NULL THEN
    RAISE EXCEPTION 'Verified organizer and bank account required';
  END IF;

  v_sums := public.get_org_finance_snapshot(p_org_id);
  v_amount := (v_sums->>'available_kobo')::bigint;
  IF p_amount_kobo > v_amount THEN
    RAISE EXCEPTION 'Insufficient reconciled, unreserved balance';
  END IF;

  INSERT INTO public.payouts (organization_id, amount_kobo, status, reason, status_history)
  VALUES (p_org_id, p_amount_kobo::integer, 'pending',
          'Organizer requested', jsonb_build_array(jsonb_build_object(
            'at',now(),'to','pending','via','atomic_ledger_rpc','by',p_requester)))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_finance_snapshot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_organizer_payout(uuid,uuid,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_finance_snapshot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_organizer_payout(uuid,uuid,bigint) TO service_role;

COMMIT;
