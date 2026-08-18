import { assetUrl } from "../utils/assets";

export function CircleCheckbox({ checked, size = "large" }: { checked: boolean; size?: "xsmall" | "small" | "large" }) {
  return (
    <span className={`circle-checkbox circle-checkbox--${size}${checked ? " is-checked" : ""}`} aria-hidden="true">
      {checked ? <img className="circle-checkbox__check" src={assetUrl("assets/figma-icons/checkbox-check.svg")} alt="" /> : null}
    </span>
  );
}
