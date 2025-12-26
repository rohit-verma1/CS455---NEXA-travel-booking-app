import { Suspense } from "react";
import FlightReviewPage from "./FlightReviewPage";

// ✅ Force dynamic rendering to prevent Next.js from prerendering
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading booking review...</div>}>
      <FlightReviewPage />
    </Suspense>
  );
}