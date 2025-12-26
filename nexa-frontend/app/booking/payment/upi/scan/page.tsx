import { Suspense } from "react";
import UpiScanPage from "./UpiScanPage";

// ✅ Force dynamic rendering to prevent Next.js from prerendering
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading booking review...</div>}>
      <UpiScanPage />
    </Suspense>
  );
}
