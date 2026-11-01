import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-stage">
      <section className="auth-story" aria-label="About JaiyePass">
        <div className="auth-story-top"><span className="auth-story-symbol" aria-hidden="true">✳</span><span>BUILT FOR THE MOMENTS THAT MATTER</span></div>
        <div className="auth-story-content">
          <p className="auth-story-eyebrow">EXPLORE · EXPERIENCE · REPEAT</p>
          <p className="auth-story-title">Be there.<br/><em>Feel more.</em></p>
          <p className="auth-story-copy">From the next big concert to your favorite intimate gathering — your best stories start with showing up.</p>
        </div>
        <div className="auth-story-bottom"><span>01 / YOUR PASS TO A GOOD TIME</span><span>MADE FOR NIGERIA <span aria-hidden="true">↗</span></span></div>
      </section>
      <section className="auth-content">
        <div className="auth-mobile-brand"><Link href="/" className="font-bold" aria-label="JaiyePass homepage">Jaiye<span className="text-neon-deep">Pass</span></Link><span>YOUR PASS TO A GOOD TIME</span></div>
        {children}
      </section>
    </div>
  );
}
