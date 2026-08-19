type QuickStartCardProps = {
  text: string;
  typeLabel?: string;
  onSelect?: (text: string) => void;
};

export function QuickStartCard({ text, typeLabel, onSelect }: QuickStartCardProps) {
  return (
    <button type="button" className="quick-card" onClick={() => onSelect?.(text)}>
      <span className="quick-card__text">
        {typeLabel && (
          <>
            <strong className="quick-card__type">{typeLabel}</strong>
            <span aria-hidden="true">｜</span>
          </>
        )}
        {text}
      </span>
    </button>
  );
}
