import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FigmaIcon } from "./FigmaIcon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "ghost" | "outline" | "primary";
  size?: "small" | "medium";
};

export function Button({ children, variant = "outline", size = "medium", className = "", type = "button", ...props }: ButtonProps) {
  const sizeClass = size === "small" ? "profile-button--small" : "";
  return <button type={type} className={`profile-button profile-button--${variant} ${sizeClass} ${className}`} {...props}>{children}</button>;
}

export function QuickReplyButton({ children, ...props }: Omit<ButtonProps, "variant" | "size">) {
  return (
    <Button variant="primary" size="small" {...props}>
      <span>{children}</span>
      <FigmaIcon name="arrow-right" size={20} />
    </Button>
  );
}

export function SuggestionButton({ children, className = "", ...props }: Omit<ButtonProps, "variant" | "size">) {
  return (
    <Button className={`conversation-suggestion-button ${className}`} variant="outline" size="small" {...props}>
      <span>{children}</span>
      <FigmaIcon name="arrow-down-right" size={16} />
    </Button>
  );
}
