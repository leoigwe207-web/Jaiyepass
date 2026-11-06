import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="jp-v3-auth-page">
      <aside aria-label="JaiyePass experience" className="jp-v3-auth-story">
        <div className="jp-v3-auth-brand"><Link href="/" className="jp-brand-logo" aria-label="JaiyePass home">Jaiye<span>Pass</span><span className="jp-logo-star" aria-hidden="true">✳</span></Link><span>MEMORIES START HERE</span></div>
        <div className="jp-v3-auth-poster"><span>01 / YOUR NEXT CHAPTER</span><h2>Good times<br/>look good<br/><em>on you.</em></h2><p>One account. Plenty of possibilities.<br/>Your pass to a good time starts here.</p></div>
        <div className="jp-v3-auth-design" aria-hidden="true"><span>✳</span></div>
        <p className="jp-v3-auth-brief">DISCOVER. BOOK. SHOW UP. LIVE MORE. ✳</p>
      </aside>
      <main className="jp-v3-auth-main">
        <div className="jp-v3-auth-content">
          <Link href="/" className="jp-auth-wordmark" aria-label="JaiyePass home">Jaiye<span>Pass</span><span className="jp-logo-star" aria-hidden="true">✳</span></Link>
          {children}
        </div>
        <div className="jp-v3-auth-policy"><span>SECURE ACCOUNT ACCESS</span><Link href="/privacy">Privacy policy ↗</Link></div>
      </main>
    </div>
  );
}
