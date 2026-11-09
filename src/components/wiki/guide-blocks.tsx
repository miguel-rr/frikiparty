import { panel, panelGold, td, th } from '@/components/theme/primitives';
import type { GuideBlock } from '@/lib/wiki/guides/types';

const bodyText = 'text-(--parchment)/90';

/** One block of a hand-written guide: paragraph, list, steps, tip or table. */
const Block = ({ block }: { block: GuideBlock }) => {
  switch (block.kind) {
    case 'text':
      return <p className={bodyText}>{block.text}</p>;
    case 'list':
      return (
        <ul className={`flex list-disc flex-col gap-2 pl-5 ${bodyText}`}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'steps':
      return (
        <ol className="flex flex-col gap-2">
          {block.items.map((item, i) => (
            <li className="flex gap-3" key={item}>
              <span className="d-display flex size-7 shrink-0 items-center justify-center rounded-full border border-(--hair-gold) font-bold text-(--gold) text-sm">
                {i + 1}
              </span>
              <span className={`${bodyText} pt-0.5`}>{item}</span>
            </li>
          ))}
        </ol>
      );
    case 'tip':
      return (
        <div className={`${panelGold} flex flex-col gap-1.5 p-4`}>
          <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
            {block.title}
          </span>
          <p className={`${bodyText} text-sm`}>{block.text}</p>
        </div>
      );
    case 'table':
      return (
        <div className={`${panel} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {block.head.map((h) => (
                  <th className={th} key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row
                    .map((cell, i) => ({
                      cell,
                      column: block.head[i],
                      first: i === 0,
                    }))
                    .map(({ cell, column, first }) => (
                      <td
                        className={`${td} ${first ? 'font-bold text-(--gold-hi)' : bodyText}`}
                        key={column}
                      >
                        {cell}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
};

const GuideBlocks = ({ blocks }: { blocks: GuideBlock[] }) => (
  <div className="flex flex-col gap-4">
    {blocks.map((block, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static content
      <Block block={block} key={i} />
    ))}
  </div>
);

export { GuideBlocks };
