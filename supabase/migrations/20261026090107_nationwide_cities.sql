-- JaiyePass V2: non-destructive nationwide city expansion.
-- DEPENDENCY: apply and verify existing 0001–0005 migrations first.
-- Intent: support nationwide search without changing existing city IDs.
-- This file is intentionally NOT applied automatically.
-- Do not run if the source schema differs from the documented cities table.
BEGIN;

INSERT INTO public.cities (name, slug, sort_order) VALUES
  ('Aba', 'aba', 10),
  ('Abeokuta', 'abeokuta', 11),
  ('Abakaliki', 'abakaliki', 12),
  ('Ado Ekiti', 'ado-ekiti', 13),
  ('Akure', 'akure', 14),
  ('Asaba', 'asaba', 15),
  ('Awka', 'awka', 16),
  ('Bauchi', 'bauchi', 17),
  ('Benin City', 'benin-city', 18),
  ('Birnin Kebbi', 'birnin-kebbi', 19),
  ('Calabar', 'calabar', 20),
  ('Damaturu', 'damaturu', 21),
  ('Dutse', 'dutse', 22),
  ('Enugu', 'enugu', 23),
  ('Gombe', 'gombe', 24),
  ('Gusau', 'gusau', 25),
  ('Ilorin', 'ilorin', 26),
  ('Jalingo', 'jalingo', 27),
  ('Jos', 'jos', 28),
  ('Kaduna', 'kaduna', 29),
  ('Kano', 'kano', 30),
  ('Katsina', 'katsina', 31),
  ('Lafia', 'lafia', 32),
  ('Lokoja', 'lokoja', 33),
  ('Maiduguri', 'maiduguri', 34),
  ('Makurdi', 'makurdi', 35),
  ('Minna', 'minna', 36),
  ('Nnewi', 'nnewi', 37),
  ('Onitsha', 'onitsha', 38),
  ('Oshogbo', 'oshogbo', 39),
  ('Owerri', 'owerri', 40),
  ('Oyo', 'oyo', 41),
  ('Sokoto', 'sokoto', 42),
  ('Umuahia', 'umuahia', 43),
  ('Uyo', 'uyo', 44),
  ('Warri', 'warri', 45),
  ('Yenagoa', 'yenagoa', 46),
  ('Yola', 'yola', 47),
  ('Zaria', 'zaria', 48)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
