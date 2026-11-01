import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return <ResetPasswordForm notice={message?.slice(0, 180)} />;
}
