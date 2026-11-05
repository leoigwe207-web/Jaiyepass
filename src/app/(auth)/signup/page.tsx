import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const sp = await searchParams;
  if (sp.role !== "organizer" && sp.role !== "individual") redirect("/choose-account");
  return <SignupForm hostIntent={sp.role === "organizer"} />;
}
