import { describe, it, expect } from "vitest";
import { ADMIN_REPORTS_SELECT } from "@/lib/admin-report-query";

describe("admin reports database relationships", () => {
  it("joins reports to the event via its explicit foreign key", () => {
    expect(ADMIN_REPORTS_SELECT).toContain("event:events!event_reports_event_id_fkey(");
  });
  it("disambiguates the reporter profile from resolved_by", () => {
    expect(ADMIN_REPORTS_SELECT).toContain("reporter:profiles!event_reports_reporter_id_fkey(");
    expect(ADMIN_REPORTS_SELECT).not.toContain("reporter:profiles(");
  });
});
