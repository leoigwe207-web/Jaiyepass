/** Explicit FK relationship prevents PGRST201 ambiguity: event_reports also has resolved_by -> profiles. */
export const ADMIN_REPORTS_SELECT =
  "id, reason, details, status, created_at, event:events!event_reports_event_id_fkey(id,title,slug,status), reporter:profiles!event_reports_reporter_id_fkey(full_name)" as const;
