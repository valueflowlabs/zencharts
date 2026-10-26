"use client";

import { useEffect, useRef } from "react";

// Mobile browsers (iOS Safari especially) ignore `maximumScale` and let the
// user pinch-zoom anyway. `position: fixed` anchors to the layout viewport,
// so once zoomed the floating controls drift off-screen. This layer tracks
// the *visual* viewport instead and counter-scales, keeping its fixed
// children on-screen at their normal size whatever the zoom or pan.
export default function ViewportPin({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const s = vv.scale || 1;
      el.style.width = `${vv.width * s}px`;
      el.style.height = `${vv.height * s}px`;
      el.style.transform = `translate(${vv.offsetLeft}px, ${vv.offsetTop}px) scale(${1 / s})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    return () => {
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="vv-pin">
      {children}
    </div>
  );
}
