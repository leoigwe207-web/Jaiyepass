import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="jp-auth-shell">
      <Link href="/" className="jp-auth-wordmark" aria-label="JaiyePass home">
        Jaiye<span>Pass</span><span className="jp-logo-star" aria-hidden="true">✳</span>
      </Link>
      {children}
    </div>
  );
}
