import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FigmaIcon } from "./FigmaIcon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "ghost" | "outline" | "primary" | "secondary";
  size?: "small" | "medium";
};

export function Button({ children, variant = "outline", size = "medium", className = "", type = "button", ...props }: ButtonProps) {
  const sizeClass = size === "small" ? "profile-button--small" : "";
  return <button type={type} className={`profile-button profile-button--${variant} ${sizeClass} ${className}`} {...props}>{children}</button>;
}

export function BusinessButton({ children, points, className = "", ...props }: Omit<ButtonProps, "variant" | "size"> & { points: number }) {
  return (
    <Button className={`business-button ${className}`.trim()} variant="primary" size="small" {...props}>
      <span className="business-button__label">{children}</span>
      <span className="business-button__points" aria-label={`${points} 积分`}>
        <FigmaIcon name="points-star" size={16} />
        <span>{points}</span>
      </span>
    </Button>
  );
}

export function QuickReplyButton({ children, ...props }: Omit<ButtonProps, "variant" | "size">) {
  return (
    <Button variant="primary" size="small" {...props}>
      <span>{children}</span>
      <FigmaIcon name="arrow-right" size={20} />
    </Button>
  );
}

export function OutlineToggleButton({
  children,
  className = "",
  selected = false,
  appearance = "outline",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  appearance?: "outline" | "base";
}) {
  return (
    <button
      type={type}
      className={`outline-toggle-button outline-toggle-button--${appearance} ${selected ? "is-selected" : ""} ${className}`.trim()}
      aria-pressed={selected}
      {...props}
    >
      {children}
    </button>
  );
}
