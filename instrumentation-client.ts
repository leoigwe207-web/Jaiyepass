// Analytics bootstrap for the browser. Next runs this before the app hydrates
// (Next 15.3+). It is a no-op unless both NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN and
// NEXT_PUBLIC_POSTHOG_HOST are set, and starts opted out until consent.
import { initAnalytics } from "./src/lib/analytics/client";

initAnalytics();
