import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = { title: "Access restricted" };

export default function AccessDeniedPage() {
  return (
    <section className="mx-auto max-w-xl px-5 py-20 sm:py-28" aria-labelledby="access-heading">
      <p className="eyebrow">ACCOUNT PERMISSIONS</p>
      <h1 id="access-heading" className="display-md mt-3">This dashboard is restricted.</h1>
      <p className="mt-5 text-base leading-relaxed text-ink-soft">
        You are signed in, but this account does not have administrator access.
        If you have a separate admin account, sign out and use that email instead.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <LogoutButton />
        <Link href="/account/tickets" className="text-sm font-semibold underline underline-offset-4">
          Go to my tickets
        </Link>
      </div>
    </section>
  );
}
