import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Individual dashboard" };
export const dynamic = "force-dynamic";

const shortcuts = [
  { href: "/account/tickets", title: "My tickets", description: "Open your QR tickets and revisit upcoming experiences.", number: "01" },
  { href: "/account/orders", title: "My bookings", description: "Review ticket orders and your payment history.", number: "02" },
  { href: "/account/saved", title: "Saved events", description: "All the things you've bookmarked for later.", number: "03" },
  { href: "/account/profile", title: "My profile", description: "Keep your information up to date.", number: "04" },
];

export default async function IndividualDashboard() {
  const user = await requireUser("/account");
  return (
    <section className="jp-v3-personal-dashboard">
      <div className="jp-v3-personal-hero">
        <p className="eyebrow">YOUR JAIYEPASS / INDIVIDUAL</p>
        <h2>Go make some <em className="text-[#ff946c]">memories.</em></h2>
        <p>Welcome back, {user.fullName || "explorer"}. All your plans, tickets, and good times live right here.</p>
      </div>
      <div className="jp-v3-personal-shortcuts">
        {shortcuts.map(item => <Link key={item.href} href={item.href} className="jp-v3-personal-shortcut">
          <div><span className="jp-v3-section-kicker">{item.number} / YOUR SPACE</span><h3 className="mt-4">{item.title}</h3><p>{item.description}</p></div>
          <span>Open section ↗</span>
        </Link>)}
      </div>
      <div className="mt-8"><Link href="/events" className="jp-v3-dark-cta">Discover events ↗</Link></div>
    </section>
  );
}
