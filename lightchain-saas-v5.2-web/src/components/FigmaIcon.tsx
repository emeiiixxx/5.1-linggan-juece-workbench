import type { CSSProperties } from "react";
import { assetUrl } from "../utils/assets";

type FigmaIconProps = {
  name: string;
  size?: number;
  className?: string;
};

const ICON_ROOT = assetUrl("assets/figma-icons");
const ICON_ASSETS: Record<string, string> = {
  dot: "demand-dot.svg",
};

const ART_INSETS: Record<string, string> = {
  "add-file": "9.38% 25% 9.38% 21.88%",
  "add-image": "12.5% 6.25% 12.5% 12.5%",
  "add-project": "12.5% 6.25% 12.5% 9.38%",
  "arrow-up": "20.31% 26.56%",
  "arrow-down-right": "25%",
  "arrow-up-right": "25%",
  "arrow-left": "25% 18.75% 25%",
  "chevron-down": "37.5% 25%",
  "chevron-left": "25% 37.5%",
  "chevron-right": "25% 37.5%",
  check: "0",
  clear: "6.25%",
  copy: "12.5% 12.5% 12.5% 18.75%",
  delete: "12.5%",
  dot: "37.5%",
  close: "13.54%",
  "company-info": "14.92% 12.5% 12.5%",
  "customer-support": "9.38% 7.81%",
  "expand-window": "12.5%",
  global: "9.38%",
  "help-center": "6.25% 6.25% 6.88%",
  idea: "6.25% 18.75%",
  like: "9.38% 10.36% 9.38% 9.38%",
  dislike: "9.38% 9.37% 9.38% 10.36%",
  "more-horizontal": "43.75% 12.5%",
  modify: "15.41% 12.5% 12.5%",
  "new-chat": "14.42% 9.6% 10.77%",
  "new-task": "8.75% 7.99% 12.5% 12.5%",
  plus: "14.06%",
  "points-star": "12.81% 3.54% 9.79% 5.94%",
  project: "12.69% 9.54% 12.68%",
  search: "12.5%",
  reset: "13.54%",
  task: "6.25%",
  trash: "6.25% 12.5% 9.38%",
};

export function FigmaIcon({ name, size = 20, className = "" }: FigmaIconProps) {
  const asset = `${ICON_ROOT}/${ICON_ASSETS[name] ?? `${name}.svg`}`;
  const frameStyle = {
    width: size,
    height: size,
  } as CSSProperties;
  const artStyle = {
    inset: ART_INSETS[name] ?? "0",
    WebkitMaskImage: `url(${asset})`,
    maskImage: `url(${asset})`,
  } as CSSProperties;

  return (
    <span className={`figma-icon ${className}`} style={frameStyle} aria-hidden="true">
      <span className="figma-icon__art" style={artStyle} />
    </span>
  );
}
