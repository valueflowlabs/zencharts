"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Chart from "@/components/Chart";
import TimeframeSelector from "@/components/TimeframeSelector";
import Terminal from "@/components/Terminal";
import ViewportPin from "@/components/ViewportPin";
import { ConfigProvider } from "@/lib/config/ConfigContext";
import {
  DEFAULT_TIMEFRAME,
  isValidTimeframe,
  type TimeframeKey,
} from "@/lib/timeframes";

// The URL's `?tf=` param is the single source of truth for the timeframe,
// so a selection survives reload and the link is shareable.
function ZenChart() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tfParam = searchParams.get("tf") ?? "";
  const timeframe: TimeframeKey = isValidTimeframe(tfParam)
    ? tfParam
    : DEFAULT_TIMEFRAME;

  const handleChange = useCallback(
    (tf: TimeframeKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tf", tf);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <main className="zen">
      <Chart timeframe={timeframe} />
      <ViewportPin>
        <TimeframeSelector value={timeframe} onChange={handleChange} />
      </ViewportPin>
    </main>
  );
}

export default function Home() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <ConfigProvider>
      <Suspense fallback={<main className="zen" />}>
        <ZenChart />
      </Suspense>
      <ViewportPin>
        <Terminal />
      </ViewportPin>
    </ConfigProvider>
  );
}
