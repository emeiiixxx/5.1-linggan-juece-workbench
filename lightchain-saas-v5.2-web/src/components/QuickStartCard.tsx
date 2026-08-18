type QuickStartCardProps = {
  text: string;
};

export function QuickStartCard({ text }: QuickStartCardProps) {
  return (
    <button
      type="button"
      className="quick-card"
      title={text}
    >
      <span className="quick-card__text">{text}</span>
    </button>
  );
}
