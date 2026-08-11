import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "ghost" | "outline" | "primary";
  size?: "small" | "medium";
};

export function Button({ children, variant = "outline", size = "medium", className = "", type = "button", ...props }: ButtonProps) {
  const sizeClass = size === "small" ? "profile-button--small" : "";
  return <button type={type} className={`profile-button profile-button--${variant} ${sizeClass} ${className}`} {...props}>{children}</button>;
}
