"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupAction, type AuthFormState } from "@/app/(auth)/actions";
import { PasswordField } from "@/components/auth/password-field";
import { SubmitButton } from "@/components/submit-button";

type AccountType = "individual" | "organizer";
const steps = ["Account type", "About you", "Email confirmation"];

function Progress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="jp-signup-steps" aria-label="Account registration progress">
      {steps.map((label, i) => {
        const number = i + 1;
        return (
          <li key={label} className={number === current ? "current" : number < current ? "complete" : ""} aria-current={number === current ? "step" : undefined}>
            <span className="jp-step-number">{number < current ? "✓" : number}</span>
            <span className="jp-step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function AccountIcon({ organizer }: { organizer: boolean }) {
  return organizer ? (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-12 w-12">
      <rect x="7" y="17" width="34" height="23" rx="3"/><path d="M17 17v-5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5M7 25h34M21 24v5h6v-5"/>
    </svg>
  ) : (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-12 w-12">
      <circle cx="24" cy="24" r="20"/><circle cx="24" cy="19" r="8"/><path d="M9 38c2-8 8-12 15-12s13 4 15 12"/>
    </svg>
  );
}

export function SignupForm({ initialRole }: { initialRole?: AccountType }) {
  const [role, setRole] = useState<AccountType | null>(initialRole ?? null);
  const [step, setStep] = useState<1 | 2>(1);
  const [state, formAction] = useActionState<AuthFormState, FormData>(signupAction, {});
  const stage: 1 | 2 | 3 = state.message ? 3 : step;

  return (
    <div className="jp-signup-form">
      <p className="text-sm font-semibold text-neon-deep">JOIN JAIYEPASS</p>
      <h1 className="jp-screen-heading">Create an account</h1>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">
        {stage === 1 ? "A few details and you're ready to discover or create memorable events." : stage === 2 ? "Tell us a little about yourself to get started." : "You're almost there."}
      </p>
      <Progress current={stage} />

      {state.message ? (
        <section className="mt-10 space-y-5" role="status">
          <div className="jp-confirm-mark">✓</div>
          <h2 className="text-2xl font-bold">Check your email</h2>
          <p className="leading-relaxed text-ink-soft">{state.message}</p>
          <p className="text-sm text-ink-soft">Once you confirm your email, sign in using the account type you selected.</p>
          <Link className="jp-button-primary inline-flex" href={role === "organizer" ? "/login?role=organizer" : "/login?role=individual"}>Go to sign in</Link>
        </section>
      ) : step === 1 ? (
        <section className="mt-9" aria-labelledby="choose-type-heading">
          <h2 id="choose-type-heading" className="text-lg font-bold">Choose your account type</h2>
          <p className="mt-2 text-sm text-ink-soft">Pick the option that best describes what you want to do.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={() => setRole("individual")} aria-pressed={role === "individual"} className={"jp-account-choice " + (role === "individual" ? "selected" : "")}>
              <AccountIcon organizer={false}/>
              <span className="text-xl font-bold">Individual</span>
              <span className="text-sm leading-relaxed text-ink-soft">Discover experiences, book tickets and manage your plans.</span>
              <span aria-hidden="true" className="jp-choice-radio">{role === "individual" ? "✓" : ""}</span>
            </button>
            <button type="button" onClick={() => setRole("organizer")} aria-pressed={role === "organizer"} className={"jp-account-choice " + (role === "organizer" ? "selected" : "")}>
              <AccountIcon organizer/>
              <span className="text-xl font-bold">Organizer</span>
              <span className="text-sm leading-relaxed text-ink-soft">Create events, sell tickets and manage attendees.</span>
              <span aria-hidden="true" className="jp-choice-radio">{role === "organizer" ? "✓" : ""}</span>
            </button>
          </div>
          <div className="mt-8 flex gap-3">
            <Link href="/" className="jp-button-secondary flex-1 text-center">Cancel</Link>
            <button type="button" disabled={!role} onClick={() => setStep(2)} className="jp-button-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40">Continue</button>
          </div>
        </section>
      ) : (
        <section className="mt-9" aria-labelledby="signup-about-heading">
          <h2 id="signup-about-heading" className="text-lg font-bold">Tell us about yourself</h2>
          <p className="mt-2 text-sm text-ink-soft">
            {role === "organizer" ? "Use your real name for your organizer account. You can set up your event brand and payout details later." : "Your tickets and bookings will be linked to this account."}
          </p>
          <form action={formAction} className="auth-form mt-7">
            <input type="hidden" name="accountType" value={role ?? "individual"} />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="auth-field">
                <label htmlFor="firstName" className="auth-label">First name <span className="text-neon-deep">*</span></label>
                <input id="firstName" name="firstName" type="text" required minLength={1} maxLength={60} autoComplete="given-name" className="auth-input" placeholder="First name"/>
              </div>
              <div className="auth-field">
                <label htmlFor="lastName" className="auth-label">Last name <span className="text-neon-deep">*</span></label>
                <input id="lastName" name="lastName" type="text" required minLength={1} maxLength={60} autoComplete="family-name" className="auth-input" placeholder="Last name"/>
              </div>
            </div>
            {role === "organizer" && (
              <>
                <div className="auth-field">
                  <label htmlFor="organizationName" className="auth-label">Event brand / business name (optional)</label>
                  <input id="organizationName" name="organizationName" type="text" maxLength={100} className="auth-input" placeholder="e.g. City Nights Collective"/>
                </div>
                <div className="auth-field">
                  <label htmlFor="eventCity" className="auth-label">Where will you host events?</label>
                  <select id="eventCity" name="eventCity" className="auth-input" defaultValue="">
                    <option value="">Select your main city (optional)</option>
                    <option value="Lagos">Lagos</option>
                    <option value="Abuja">Abuja</option>
                    <option value="Port Harcourt">Port Harcourt</option>
                    <option value="Ibadan">Ibadan</option>
                    <option value="Enugu">Enugu</option>
                    <option value="Other">Other city</option>
                  </select>
                </div>
              </>
            )}
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">Email address <span className="text-neon-deep">*</span></label>
              <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className="auth-input" placeholder="you@example.com"/>
            </div>
            <PasswordField autoComplete="new-password" minLength={10} hint="At least 10 characters, including a letter and a number." />
            <PasswordField id="confirmPassword" name="confirmPassword" label="Confirm password" autoComplete="new-password" minLength={10} />
            <div className="auth-field">
              <label htmlFor="referral" className="auth-label">How did you hear about JaiyePass? (optional)</label>
              <select id="referral" name="referral" className="auth-input" defaultValue="">
                <option value="">Select an option</option>
                <option value="Friends or family">Friends or family</option>
                <option value="Social media">Social media</option>
                <option value="At an event">At an event</option>
                <option value="Search engine">Search engine</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <label className="flex items-start gap-3 rounded-xl bg-paper-deep p-4 text-sm leading-relaxed text-ink-soft">
              <input type="checkbox" name="termsAccepted" value="yes" required className="mt-1 h-5 w-5 shrink-0 accent-orange-600"/>
              <span>I agree to the <Link href="/terms" className="auth-text-link">Terms</Link> and <Link href="/privacy" className="auth-text-link">Privacy Policy</Link>.</span>
            </label>
            {state.error && <p role="alert" className="auth-notice auth-notice-error">{state.error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="jp-button-secondary flex-1">Go back</button>
              <div className="flex-1"><SubmitButton label="Sign up" pendingLabel="Creating account…"/></div>
            </div>
          </form>
        </section>
      )}
      <p className="mt-8 text-center text-sm text-ink-soft">
        Already have an account? <Link href={role === "organizer" ? "/login?role=organizer" : role === "individual" ? "/login?role=individual" : "/choose-account"} className="auth-text-link">Sign in</Link>
      </p>
    </div>
  );
}
