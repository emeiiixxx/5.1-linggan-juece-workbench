import type { ReactNode } from "react";

type TagChipProps = {
  label: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
};

export function TagChip({
  label,
  leftSlot,
  rightSlot,
  className = "",
  disabled = false,
  title,
  onClick,
}: TagChipProps) {
  const content = (
    <>
      {leftSlot ? <span className="tag-chip__slot">{leftSlot}</span> : null}
      <span className="tag-chip__label">{label}</span>
      {rightSlot ? <span className="tag-chip__slot">{rightSlot}</span> : null}
    </>
  );
  const classes = `tag-chip tag-chip--outline tag-chip--medium ${className}`.trim();

  if (onClick) {
    return (
      <button type="button" className={classes} title={title} disabled={disabled} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <span className={classes} title={title} aria-disabled={disabled || undefined}>
      {content}
    </span>
  );
}
