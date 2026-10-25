import { describe, it, expect, vi, beforeEach } from "vitest";

const { fromMock, rpcMock, getSessionUser, isEventScannerFor, getOrgMembership } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  getSessionUser: vi.fn(),
  isEventScannerFor: vi.fn(),
  getOrgMembership: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser,
  isEventScannerFor,
  getOrgMembership,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock, rpc: rpcMock }),
}));

import { POST } from "@/app/api/scan/route";
import { deriveQrPayload, hashPayload } from "@/lib/ticket-token";

const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PEPPER = "scan-pepper";
const SCANNER = { id: "user-1", email: "door@example.com", role: "attendee", fullName: "Door Staff" };

function chain(result: Record<string, unknown> = {}) {
  const resolved = { data: null, error: null, ...result };
  const p: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "in", "order", "limit", "or"]) p[m] = () => p;
  p.maybeSingle = async () => resolved;
  p.then = (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
    Promise.resolve(resolved).then(res, rej);
  return p;
}

async function scan(payload: string) {
  return POST(
    new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload, eventId: EVENT_ID }),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TICKET_TOKEN_PEPPER = PEPPER;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  getSessionUser.mockResolvedValue(SCANNER);
  isEventScannerFor.mockResolvedValue(true);
  getOrgMembership.mockResolvedValue(null);
  fromMock.mockReturnValue(chain());
});

describe("POST /api/scan", () => {
  it("401s when signed out", async () => {
    getSessionUser.mockResolvedValue(null);
    const res = await scan("whatever");
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("403s when the user is not assigned to this event (and audits it)", async () => {
    isEventScannerFor.mockResolvedValue(false);
    const payload = deriveQrPayload("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", PEPPER);
    const res = await scan(payload);
    expect(res.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("audit_logs");
  });

  it("rejects payloads signed with a different pepper as invalid, without a DB claim", async () => {
    const forged = deriveQrPayload("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "attacker-pepper");
    const res = await scan(forged);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result).toBe("invalid");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("claims a genuine ticket by sha256 hash (raw token never stored)", async () => {
    const ticketId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const payload = deriveQrPayload(ticketId, PEPPER);
    rpcMock.mockResolvedValue({ data: { result: "valid", ticket_id: ticketId }, error: null });
    fromMock.mockImplementation((table: string) =>
      table === "tickets"
        ? chain({ data: { used_at: null, ticket_types: { name: "Regular" }, user: { full_name: "Ada Obi" } } })
        : chain(),
    );

    const res = await scan(payload);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result).toBe("valid");
    expect(json.ticket.attendeeName).toBe("Ada"); // first name only at the door
    expect(rpcMock).toHaveBeenCalledWith("claim_check_in", {
      p_token_hash: hashPayload(payload),
      p_event_id: EVENT_ID,
      p_scanner_id: SCANNER.id,
    });

    // The raw payload must not appear in the hash argument.
    const sentHash = rpcMock.mock.calls[0]![1].p_token_hash as string;
    expect(sentHash).not.toContain(ticketId);
  });

  it("surfaces already_used verdicts from the atomic claim", async () => {
    const payload = deriveQrPayload("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", PEPPER);
    rpcMock.mockResolvedValue({ data: { result: "already_used", ticket_id: "t" }, error: null });
    fromMock.mockReturnValue(
      chain({ data: { used_at: "2026-12-01T20:00:00.000Z", ticket_types: { name: "VIP" }, user: { full_name: "Ada" } } }),
    );

    const res = await scan(payload);
    const json = await res.json();
    expect(json.result).toBe("already_used");
    expect(json.message).toContain("Already used");
  });

  it("allows host org members (manual fallback) without scanner assignment", async () => {
    isEventScannerFor.mockResolvedValue(false);
    getOrgMembership.mockResolvedValue("manager");
    const payload = deriveQrPayload("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", PEPPER);
    rpcMock.mockResolvedValue({ data: { result: "valid", ticket_id: "t" }, error: null });
    fromMock.mockReturnValue(chain({ data: { used_at: null, ticket_types: { name: "Regular" }, user: null } }));

    const res = await scan(payload);
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalled();
  });
});
