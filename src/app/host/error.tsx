"use client";

import { AreaError } from "@/components/area-error";

export default function HostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AreaError error={error} reset={reset} areaHome="/host" areaLabel="Host dashboard" />;
}
