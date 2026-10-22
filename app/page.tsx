"use client";

import { useState } from "react";
import Chart from "@/components/Chart";
import TimeframeSelector from "@/components/TimeframeSelector";
import { DEFAULT_TIMEFRAME, type TimeframeKey } from "@/lib/timeframes";

export default function Home() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>(DEFAULT_TIMEFRAME);

  return (
    <main className="zen">
      <Chart timeframe={timeframe} />
      <TimeframeSelector value={timeframe} onChange={setTimeframe} />
    </main>
  );
}
