import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") &&
    !sp.next.startsWith("//") && !sp.next.includes("\\") ? sp.next : "";
  return <LoginForm next={next} notice={sp.message} />;
}
