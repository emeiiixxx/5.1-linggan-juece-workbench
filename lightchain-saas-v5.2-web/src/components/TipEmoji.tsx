import type { CSSProperties } from "react";

export function TipEmoji({ size = 16, className = "" }: { size?: number; className?: string }) {
  const style = {
    "--tip-emoji-size": `${size}px`,
  } as CSSProperties;

  return <span className={`tip-emoji ${className}`.trim()} style={style} aria-hidden="true">💡</span>;
}
