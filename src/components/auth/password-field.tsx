"use client";

import { useState } from "react";

/** Accessible show/hide control for all credential forms. Never stores the password. */
export function PasswordField({
  id = "password",
  name = "password",
  label = "Password",
  autoComplete = "current-password",
  minLength,
  hint,
}: {
  id?: string;
  name?: string;
  label?: string;
  autoComplete?: "current-password" | "new-password";
  minLength?: number;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className="auth-password-wrap">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={128}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="auth-input auth-password-input"
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? (
            <>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"/><path d="M9.9 5.2a10.4 10.4 0 012.1-.2c5.4 0 9.5 4.5 10 7-0.4 1.3-1.3 2.7-2.6 3.9M6.1 6.1C4 7.4 2.5 9.5 2 12c.5 2.5 4.6 7 10 7 1.5 0 2.9-.3 4.1-.9"/></svg>
              <span>Hide</span>
            </>
          ) : (
            <>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>Show</span>
            </>
          )}
        </button>
      </div>
      {hint ? <p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-ink-soft">{hint}</p> : null}
    </div>
  );
}
