import type { CSSProperties, ReactNode } from 'react';

/**
 * Lists that read as a table on wide screens and as stacked cards on a
 * phone, so nothing ever scrolls sideways. `columns` is the grid template
 * for the wide layout (a CSS variable, so Tailwind sees one static class);
 * each Cell carries the label shown only when stacked.
 */
const wide = 'md:[grid-template-columns:var(--cols)]';
const vars = (columns: string) => ({ '--cols': columns }) as CSSProperties;

const RowHead = ({
  columns,
  children,
}: {
  columns: string;
  children: ReactNode;
}) => (
  <div
    className={`hidden border-(--hair-gold) border-b px-3 py-2.5 font-mono text-(--faded) text-2xs uppercase tracking-2xl md:grid md:gap-3 ${wide}`}
    style={vars(columns)}
  >
    {children}
  </div>
);

const rowClass =
  'grid w-full gap-1.5 border-(--hair) border-b px-3 py-3 text-left text-sm transition-colors md:items-start md:gap-3';

const Row = ({
  columns,
  children,
  onClick,
  active = false,
}: {
  columns: string;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) => {
  const className = `${rowClass} ${wide} ${active ? 'bg-(--gold)/10' : ''} ${
    onClick ? 'cursor-pointer hover:bg-(--gold)/6' : ''
  }`;
  if (onClick)
    return (
      <button
        className={className}
        onClick={onClick}
        style={vars(columns)}
        type="button"
      >
        {children}
      </button>
    );
  return (
    <div className={className} style={vars(columns)}>
      {children}
    </div>
  );
};

/** One value with its stacked-layout label; `clamp` shortens long texts on a phone. */
const Cell = ({
  label,
  children,
  clamp = false,
  className = '',
}: {
  label: string;
  children: ReactNode;
  clamp?: boolean;
  className?: string;
}) => (
  <span className={`flex min-w-0 gap-2 md:block ${className}`}>
    <span className="w-16 shrink-0 pt-0.5 font-mono text-(--faded) text-2xs uppercase tracking-2xl md:hidden">
      {label}
    </span>
    <span
      className={`min-w-0 break-words text-(--parchment) ${
        clamp ? 'line-clamp-3 md:line-clamp-none' : ''
      }`}
    >
      {children}
    </span>
  </span>
);

export { Cell, Row, RowHead };
