import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Individual dashboard" };
export const dynamic = "force-dynamic";

const shortcuts = [
  { href: "/account/tickets", title: "My tickets", description: "Open your QR tickets and see upcoming experiences." },
  { href: "/account/orders", title: "My bookings", description: "Review ticket orders and payment history." },
  { href: "/account/saved", title: "Saved events", description: "Return to the events you are interested in." },
  { href: "/account/profile", title: "My profile", description: "Manage your personal information." },
];

export default async function IndividualDashboard() {
  const user = await requireUser("/account");
  return (
    <section className="space-y-6">
      <div>
        <p className="eyebrow">Individual dashboard</p>
        <h2 className="display-md mt-2">Your next experience starts here.</h2>
        <p className="mt-2 text-ink-soft">Welcome, {user.fullName || "explorer"}. Manage your tickets and discover what is happening.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {shortcuts.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-card border border-line bg-white p-6 hover:border-neon-deep">
            <h3 className="text-xl font-bold">{item.title}</h3>
            <p className="mt-2 text-sm text-ink-soft">{item.description}</p>
            <span className="mt-4 block text-sm font-semibold text-neon-deep">Open →</span>
          </Link>
        ))}
      </div>
      <Link href="/events" className="inline-flex rounded-card bg-neon-deep px-5 py-3 text-sm font-semibold text-white">Explore events</Link>
    </section>
  );
}
