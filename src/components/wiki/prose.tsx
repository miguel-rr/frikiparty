/** Plain-text paragraphs (blank-line separated) as the site's body text. */
const Prose = ({
  text,
  className = '',
}: {
  text: string | null | undefined;
  className?: string;
}) => {
  if (!text) return null;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={`flex flex-col gap-3 text-(--parchment)/90 ${className}`}>
      {paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
      ))}
    </div>
  );
};

export { Prose };
