"use client";

import { useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setStatus("busy");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          subject: fd.get("subject"),
          message: fd.get("message"),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("done");
        setMessage("Message received — we'll reply to your email within one business day.");
        form.reset();
      } else {
        setStatus("error");
        setMessage(json.error ?? "Could not send your message. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — try again.");
    }
  }

  if (status === "done") {
    return (
      <div role="status" className="rounded-card border border-success/30 bg-success/5 p-6">
        <p className="font-semibold text-success">Message received</p>
        <p className="mt-1 text-sm text-ink-soft">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="mb-1 block text-sm font-semibold">
            Name
          </label>
          <input
            id="c-name"
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="c-email" className="mb-1 block text-sm font-semibold">
            Email
          </label>
          <input
            id="c-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="c-subject" className="mb-1 block text-sm font-semibold">
          Subject
        </label>
        <input
          id="c-subject"
          name="subject"
          required
          minLength={2}
          maxLength={120}
          className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label htmlFor="c-message" className="mb-1 block text-sm font-semibold">
          Message
        </label>
        <textarea
          id="c-message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm"
        />
      </div>
      {status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "busy"}
        className="rounded-card bg-ink px-6 py-3 text-sm font-semibold text-paper hover:bg-night disabled:opacity-60"
      >
        {status === "busy" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
