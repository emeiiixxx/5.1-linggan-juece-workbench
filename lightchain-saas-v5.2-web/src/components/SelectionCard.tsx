import type { ReactNode } from "react";
import { CircleCheckbox } from "./CircleCheckbox";
import { Radio } from "./Radio";
import { ProgressiveImage } from "./ProgressiveImage";

export type SelectionCardMode = "radio" | "checkbox";

export function SelectionControl({ mode, selected }: { mode: SelectionCardMode; selected: boolean }) {
  if (mode === "radio") return <Radio checked={selected} />;

  return <CircleCheckbox checked={selected} size="small" />;
}

export function SelectionCard({
  mode,
  selected,
  disabled = false,
  image,
  title,
  description,
  supporting,
  className = "",
  onSelect,
}: {
  mode: SelectionCardMode;
  selected: boolean;
  disabled?: boolean;
  image?: { src: string; alt?: string };
  title: ReactNode;
  description?: ReactNode;
  supporting?: ReactNode;
  className?: string;
  onSelect: () => void;
}) {
  const stateClass = selected ? " is-selected" : "";
  const mediaClass = image ? " selection-card--media" : " selection-card--text";

  return (
    <button
      type="button"
      role={mode}
      aria-checked={selected}
      data-message-meta="disabled"
      data-copy-exclude="true"
      className={`selection-card selection-card--${mode}${mediaClass}${stateClass}${className ? ` ${className}` : ""}`}
      disabled={disabled}
      onClick={onSelect}
    >
      {image ? (
        <span className="selection-card__media" aria-hidden={image.alt ? undefined : true}>
          <ProgressiveImage src={image.src} alt={image.alt ?? ""} />
        </span>
      ) : null}
      <span className="selection-card__copy">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
        {supporting ? <small>{supporting}</small> : null}
      </span>
      <SelectionControl mode={mode} selected={selected} />
    </button>
  );
}
