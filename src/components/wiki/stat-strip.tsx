/** A compact row of labelled numbers (cost, command points, health…). Null values are skipped. */
const StatStrip = ({
  items,
}: {
  items: { label: string; value: number | string | null | undefined }[];
}) => {
  const shown = items.filter(
    (i) => i.value !== null && i.value !== undefined && i.value !== '',
  );
  if (shown.length === 0) return null;
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1">
      {shown.map((i) => (
        <div className="flex items-baseline gap-1.5" key={i.label}>
          <dt className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
            {i.label}
          </dt>
          <dd className="font-bold font-mono text-(--gold) text-sm">
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  );
};

export { StatStrip };
