import type { ReactNode } from 'react';

import { type DiffPart, diffWords } from '@/lib/translations/diff';
import { valueText } from '@/lib/translations/str';

const hotkeyClass =
  'rounded-sm bg-(--gold)/15 px-0.5 text-(--gold-hi) underline decoration-(--gold) underline-offset-2';

/**
 * Pieces of a game text: literal `\n` breaks lines, `&X` marks the hotkey.
 * Keys are the piece's offset in the text, unique and stable.
 */
const pieces = (text: string, keyPrefix = ''): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let offset = 0;
  for (const chunk of text.split(/(\\n|&[^\s&])/)) {
    const key = `${keyPrefix}${offset}`;
    if (chunk === '\\n') nodes.push(<br key={key} />);
    else if (chunk.startsWith('&') && chunk.length === 2)
      nodes.push(
        <span className={hotkeyClass} key={key} title="Atajo de teclado">
          {chunk.slice(1)}
        </span>,
      );
    else if (chunk !== '') nodes.push(<span key={key}>{chunk}</span>);
    offset += chunk.length;
  }
  return nodes;
};

/**
 * A string as the game shows it: `text` is the bare text (our strings),
 * `value` the raw quoted line from a file. Null shows a dash.
 */
const StrText = ({
  text,
  value,
  className = '',
}: {
  text?: string | null;
  value?: string | null;
  className?: string;
}) => {
  const shown = text ?? (value != null ? (valueText(value) ?? value) : null);
  if (shown == null) return <span className="text-(--faded)/60">—</span>;
  if (shown === '')
    return <span className="text-(--faded)/60 italic">vacío</span>;
  return <span className={className}>{pieces(shown)}</span>;
};

const partClass: Record<DiffPart['type'], string> = {
  same: '',
  add: 'rounded-sm bg-(--gold)/20 text-(--gold-hi)',
  del: 'rounded-sm bg-(--ember)/20 text-(--ember) line-through',
};

/** Two texts with their differences marked word by word. */
const StrDiff = ({ before, after }: { before: string; after: string }) => {
  let offset = 0;
  return (
    <span>
      {diffWords(before, after).map((part) => {
        const key = `${part.type}-${offset}`;
        offset += part.text.length;
        return (
          <span className={partClass[part.type]} key={key}>
            {pieces(part.text, `${key}-`)}
          </span>
        );
      })}
    </span>
  );
};

export { StrDiff, StrText };
