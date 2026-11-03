import Link from "next/link";
import type { ReactNode } from "react";
import { EventArtwork } from "./event-artwork";

/** Event covers are real hosted artwork or an accessible editorial fallback. */
export function EventImage({
  src,
  alt,
  title,
  category,
  className = "",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  title?: string;
  category?: string | null;
  className?: string;
  priority?: boolean;
}) {
  return (
    <EventArtwork
      src={src}
      alt={alt}
      title={title ?? alt}
      category={category}
      className={className}
      priority={priority}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "live" | "success" | "warning" | "danger";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-paper-dim text-ink-soft border-line",
    live: "bg-neon text-white border-neon",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    danger: "bg-danger/10 text-danger border-danger/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-card border px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}


export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  const styles = {
    primary:
      "bg-neon text-white hover:bg-neon-deep focus-visible:outline-ink disabled:bg-paper-dim disabled:text-ink-faint",
    secondary:
      "border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
    ghost: "text-ink underline decoration-2 underline-offset-4 hover:text-neon-deep",
  }[variant];
  return (
    <Link
      href={href}
      className={`jp-primary-action inline-flex items-center justify-center gap-2 rounded-card px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-paper-deep px-6 py-12 text-center">
      <p className="display-md">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description }: { title?: string; description: string }) {
  return (
    <div role="alert" className="rounded-card border border-danger/30 bg-danger/5 px-6 py-8 text-center">
      <p className="display-md text-danger">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{description}</p>
    </div>
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-card ${className}`} aria-hidden="true" />;
}
