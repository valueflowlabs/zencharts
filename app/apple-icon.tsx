import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same three-candle mark as app/icon.svg, rendered to PNG for iOS.
export default function AppleIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#ebe2cf"/><g stroke-width="1.5" stroke-linecap="round"><line x1="9" y1="9" x2="9" y2="23" stroke="#7d848b"/><line x1="16" y1="5" x2="16" y2="21" stroke="#4e6b87"/><line x1="23" y1="8" x2="23" y2="27" stroke="#8a5a36"/></g><rect x="6.5" y="12" width="5" height="8" rx="1" fill="#7d848b"/><rect x="13.5" y="8" width="5" height="10" rx="1" fill="#4e6b87"/><rect x="20.5" y="11" width="5" height="12" rx="1" fill="#8a5a36"/></svg>`;
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        width={180}
        height={180}
        src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`}
        alt=""
      />
    ),
    size,
  );
}
