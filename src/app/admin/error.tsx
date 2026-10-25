"use client";

import { AreaError } from "@/components/area-error";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AreaError error={error} reset={reset} areaHome="/admin" areaLabel="Admin" />;
}
