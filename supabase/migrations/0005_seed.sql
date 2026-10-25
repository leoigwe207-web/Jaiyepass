-- 0005_seed.sql — reference data + clearly-labelled demo content
-- Demo rows are marked is_demo = true and surfaced in the UI as demo data
-- until real organizers publish their own listings.

insert into public.cities (name, slug, sort_order) values
  ('Lagos', 'lagos', 1),
  ('Abuja', 'abuja', 2),
  ('Ibadan', 'ibadan', 3),
  ('Port Harcourt', 'port-harcourt', 4),
  ('Accra', 'accra', 5)
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order) values
  ('Music', 'music', 1),
  ('Nightlife', 'nightlife', 2),
  ('Comedy', 'comedy', 3),
  ('Food & Drink', 'food-drink', 4),
  ('Art & Culture', 'art-culture', 5),
  ('Sports', 'sports', 6),
  ('Tech', 'tech', 7),
  ('Fashion', 'fashion', 8),
  ('Theatre', 'theatre', 9),
  ('Community', 'community', 10)
on conflict (slug) do nothing;

-- ── Demo venues ──────────────────────────────────────────────────────────────
insert into public.venues (id, name, address, city_id, map_url)
select gen_random_uuid(), v.name, v.address, c.id, v.map_url
from (values
  ('Freedom Park', '1681B Oba Adekunle St, Ikoyi, Lagos', 'https://maps.google.com/?q=Freedom+Park+Lagos'),
  ('The Shrine', '1614B Saka Jojo Pepple St, Ikeja, Lagos', 'https://maps.google.com/?q=New+African+Shrine+Lagos'),
  ('Eko Atlantic Convention Hall', 'Eko Atlantic City, Victoria Island, Lagos', 'https://maps.google.com/?q=Eko+Atlantic+Lagos'),
  ('Landmark Beach', '1B Bonny Close, Victoria Island, Lagos', 'https://maps.google.com/?q=Landmark+Beach+Lagos'),
  ('Alliance Francaise', '9 Osborne Rd, Ikoyi, Lagos', 'https://maps.google.com/?q=Alliance+Francaise+Lagos')
) as v(name, address, map_url)
cross join lateral (select id from public.cities where slug = 'lagos') c
on conflict do nothing;

-- ── Demo host organization ───────────────────────────────────────────────────
insert into public.organizations (id, name, slug, description, contact_email, verification, created_by)
values (
  gen_random_uuid(),
  'Lagos After Dark (Demo)',
  'lagos-after-dark-demo',
  'Demo host organization shipped with the platform. Replace with a real organizer account.',
  'demo-hosts@jaiyepass.example',
  'verified',
  null
)
on conflict (slug) do nothing;

-- ── Demo events ──────────────────────────────────────────────────────────────
-- Dates are generated relative to now so the demo always shows upcoming events.
do $$
declare
  v_org uuid;
  v_city uuid;
  v_cat uuid;
  v_venue uuid;
  v_event uuid;
  v_day_offset integer;
  v_start timestamptz;
  ev record;
begin
  select id into v_org from public.organizations where slug = 'lagos-after-dark-demo';
  select id into v_city from public.cities where slug = 'lagos';

  for ev in
    select * from (values
      ('jazz-under-the-stars', 'Jazz Under the Stars', 'An evening of live Afro-jazz by the waterfront.', 'Nightlife', 'Freedom Park', 7, 22, 500000, 100, true, 3),
      ('lagos-comedy-club-night', 'Lagos Comedy Club Night', 'Six comedians, one mic, zero filter. 18+.', 'Comedy', 'The Shrine', 19, 23, 300000, 150, true, 4),
      ('afrobeats-rooftop-sessions', 'Afrobeats Rooftop Sessions', 'Sunset DJ sets and live percussion above the city.', 'Music', 'Eko Atlantic Convention Hall', 16, 23, 750000, 200, true, 5),
      ('suya-and-sounds-festival', 'Suya & Sounds Festival', 'Street food, grills and live bands across two stages.', 'Food & Drink', 'Landmark Beach', 12, 21, 0, 500, false, 6),
      ('lagos-design-week-opening', 'Lagos Design Week: Opening Night', 'Exhibition opening with talks from West African designers.', 'Art & Culture', 'Alliance Francaise', 18, 21, 200000, 80, true, 8),
      ('startup-lagos-mixer', 'Startup Lagos Mixer', 'Founders, operators and investors. Name tag required.', 'Tech', 'Freedom Park', 18, 21, 100000, 120, true, 10),
      ('beachside-yoga-morning', 'Beachside Yoga Morning', 'All-levels flow as the sun comes up. Mats provided.', 'Community', 'Landmark Beach', 7, 9, 0, 60, false, 11),
      ('naija-hitmaker-live', 'Naija Hitmaker Live', 'Recording session meets live showcase.', 'Music', 'The Shrine', 20, 23, 450000, 180, true, 12)
    ) as e(slug, title, description, category, venue, hour, end_hour, price_kobo, qty, featured, day_offset)
  loop
    select id into v_cat from public.categories where name = ev.category;
    select id into v_venue from public.venues where name = ev.venue;

    v_day_offset := ev.day_offset;
    v_start := date_trunc('day', now()) + (v_day_offset || ' days')::interval + (ev.hour || ' hours')::interval;

    v_event := gen_random_uuid();
    insert into public.events (
      id, organization_id, venue_id, category_id, city_id, slug, title, description,
      image_url, starts_at, ends_at, doors_open_at, age_guidance, status,
      published_at, featured, is_free, is_demo, created_by
    ) values (
      v_event, v_org, v_venue, v_cat, v_city, ev.slug, ev.title, ev.description,
      '/demo/' || ev.slug || '.jpg',
      v_start,
      v_start + ((ev.end_hour - ev.hour) || ' hours')::interval,
      v_start - interval '30 minutes',
      case when ev.slug in ('lagos-comedy-club-night','afrobeats-rooftop-sessions','naija-hitmaker-live')
           then '18+ with valid ID' else 'All ages welcome' end,
      'published',
      now(), ev.featured, (ev.price_kobo = 0), true, null
    );

    insert into public.ticket_types (event_id, name, description, price_kobo, quantity, per_order_limit, sales_end_at, status)
    values
      (v_event, case when ev.price_kobo = 0 then 'Free entry' else 'General admission' end,
       'Standard entry to the event.', ev.price_kobo, ev.qty, 6,
       (select starts_at from public.events where id = v_event) - interval '2 hours', 'active');

    if ev.price_kobo > 0 then
      insert into public.ticket_types (event_id, name, description, price_kobo, quantity, per_order_limit, sales_end_at, status)
      values (v_event, 'VIP', 'Priority entry and reserved viewing area.', (ev.price_kobo * 2), greatest(ev.qty / 5, 10), 4,
              (select starts_at from public.events where id = v_event) - interval '2 hours', 'active');
    end if;
  end loop;
end;
$$;
