type QuickStartCardProps = {
  text: string;
  onSelect?: (text: string) => void;
};

export function QuickStartCard({ text, onSelect }: QuickStartCardProps) {
  return (
    <button type="button" className="quick-card" onClick={() => onSelect?.(text)}>
      <span className="quick-card__text">{text}</span>
    </button>
  );
}
