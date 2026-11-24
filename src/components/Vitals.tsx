import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

/** Vercel Web Analytics and Speed Insights, mounted the same way by both pages (on in the Vercel project). */
export function Vitals() {
  return <><Analytics /><SpeedInsights /></>;
}
