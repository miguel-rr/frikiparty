'use client';

import { useEffect, useState } from 'react';
import { EditionDeck } from '@/components/editions/edition-deck';
import { EditionList } from '@/components/editions/edition-list';
import type { EditionView } from '@/lib/tournament/edition-view';

type View = 'cards' | 'list';

const STORAGE_KEY = 'frikiparty:editions-view';

const toggle = (active: boolean) =>
  `cursor-pointer rounded-full px-3.5 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-[0.18em] transition-colors ${
    active
      ? 'bg-[#c9a55726] text-(--gold-hi)'
      : 'text-(--faded) hover:text-(--parchment)'
  }`;

/**
 * The chronicle in two registers: the cards by default, a compact list
 * for when twenty years of scrolling is too much (phones, mostly). The
 * choice is remembered per browser; the server always renders the cards.
 */
const EditionsView = ({ editions }: { editions: EditionView[] }) => {
  const [view, setView] = useState<View>('cards');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'list') {
        setView('list');
      }
    } catch {
      // Storage blocked: the default view is fine.
    }
  }, []);

  const choose = (next: View) => {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Same: a preference, not a requirement.
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <fieldset
          aria-label="Vista"
          className="inline-flex rounded-full border border-(--hair) p-0.5"
        >
          <button
            aria-pressed={view === 'cards'}
            className={toggle(view === 'cards')}
            onClick={() => choose('cards')}
            type="button"
          >
            Cartas
          </button>
          <button
            aria-pressed={view === 'list'}
            className={toggle(view === 'list')}
            onClick={() => choose('list')}
            type="button"
          >
            Lista
          </button>
        </fieldset>
      </div>
      {view === 'list' ? (
        <EditionList editions={editions} />
      ) : (
        <EditionDeck editions={editions} />
      )}
    </div>
  );
};

export { EditionsView };
