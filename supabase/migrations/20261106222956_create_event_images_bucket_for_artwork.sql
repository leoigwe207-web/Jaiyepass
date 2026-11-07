-- JaiyePass organizer artwork: public display, server-authorized upload only.
-- Uploaded JPEG/PNG/WebP files are normalized to WebP (max 3 MiB)
-- by src/app/api/host/events/[id]/image/route.ts.
-- Do not create client-side storage upload policies.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-images', 'event-images', true, 3145728, ARRAY['image/webp']::text[])
ON CONFLICT (id) DO NOTHING;
