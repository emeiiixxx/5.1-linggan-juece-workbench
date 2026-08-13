import { assetUrl } from "../utils/assets";

export function Radio({ checked, size = "medium" }: { checked: boolean; size?: "medium" }) {
  return (
    <span className={`radio-control radio-control--${size}${checked ? " is-checked" : ""}`} aria-hidden="true">
      {checked ? <img src={assetUrl("assets/figma-icons/radio-dot.svg")} alt="" /> : null}
    </span>
  );
}
