"use client";

import { AreaError } from "@/components/area-error";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AreaError error={error} reset={reset} areaHome="/account/tickets" areaLabel="Account" />;
}
