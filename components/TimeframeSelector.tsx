"use client";

import { TIMEFRAMES, type TimeframeKey } from "@/lib/timeframes";

export default function TimeframeSelector({
  value,
  onChange,
}: {
  value: TimeframeKey;
  onChange: (tf: TimeframeKey) => void;
}) {
  return (
    <div className="tf-bar">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.key}
          className={`tf-btn${tf.key === value ? " tf-btn--active" : ""}`}
          onClick={() => onChange(tf.key)}
          aria-pressed={tf.key === value}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}
