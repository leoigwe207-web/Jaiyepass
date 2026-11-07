import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string; role?: string }>;
}) {
  const sp = await searchParams;
  if (sp.role !== "organizer" && sp.role !== "individual" && sp.next !== "/admin") redirect("/choose-account");
  const role = sp.role === "organizer" ? "organizer" : "individual";
  const next = sp.next && sp.next.startsWith("/") &&
    !sp.next.startsWith("//") && !sp.next.includes("\\") ? sp.next : "";
  return <LoginForm next={next} notice={sp.message} role={role} />;
}
