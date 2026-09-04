'use client';

import { type KeyboardEvent, useMemo, useRef, useState } from 'react';

import { input } from '@/components/theme/primitives';
import { mentionToken, parseBody, plainText } from '@/lib/social/mentions';

type MentionablePlayer = { id: string; name: string; slug: string };

/**
 * The composer shows `@Nombre` while typing; the stored body carries
 * `@[Nombre](id)` tokens. Picks made from the popup are remembered by
 * name and turned into tokens on submit (longest names first, so "Juan"
 * never swallows "Juan Carlos"). A body being edited seeds both — its
 * refs are slugs (the served form), which the server maps back to ids.
 */
const useComposerBody = (initialBody: string) => {
  const [text, setText] = useState(() => plainText(initialBody));
  // Picks live in a ref as well as state: a pick is followed at once by
  // the text change that inserts it, and that change must already
  // serialise with the pick in hand.
  const picked = useRef<Map<string, string>>(
    new Map(
      parseBody(initialBody).flatMap((segment) =>
        segment.kind === 'mention' ? [[segment.name, segment.ref]] : [],
      ),
    ),
  );
  const pick = (player: MentionablePlayer) => {
    picked.current.set(player.name, player.id);
  };
  /** The storable body for `source` (the current text by default). */
  const serializeWith = (source: string) => {
    let body = source;
    for (const [name, ref] of Array.from(picked.current.entries()).sort(
      (a, b) => b[0].length - a[0].length,
    )) {
      body = body.split(`@${name}`).join(mentionToken(name, ref));
    }
    return body.trim();
  };
  const serialize = () => serializeWith(text);
  return { text, setText, pick, serialize, serializeWith };
};

/** The `@query` right before the caret, if the person is typing one. */
const mentionQueryAt = (text: string, caret: number) => {
  const before = text.slice(0, caret);
  const match = /(?:^|\s)@([^\s@]{0,30})$/.exec(before);
  return match
    ? { query: match[1] ?? '', start: caret - (match[1]?.length ?? 0) - 1 }
    : null;
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const MentionComposer = ({
  players,
  value,
  onChange,
  onPick,
  onSubmit,
  onCancel,
  placeholder,
  id,
  autoFocus = false,
  className = 'min-h-20 resize-y text-sm',
  maxLength = 2000,
}: {
  players: MentionablePlayer[];
  value: string;
  onChange: (text: string) => void;
  onPick: (player: MentionablePlayer) => void;
  /** Ctrl/⌘+Enter. */
  onSubmit: () => void;
  /** Escape when no popup is open. */
  onCancel?: () => void;
  placeholder: string;
  id: string;
  autoFocus?: boolean;
  /** Textarea sizing and type, on top of the shared input look. */
  className?: string;
  maxLength?: number;
}) => {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [selected, setSelected] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const mention = mentionQueryAt(value, caret);
  const suggestions = useMemo(() => {
    if (!mention || dismissed === mention.query) {
      return [];
    }
    const query = normalize(mention.query);
    return players
      .filter((player) => normalize(player.name).includes(query))
      .slice(0, 6);
  }, [mention, dismissed, players]);
  const open = suggestions.length > 0;

  const insert = (player: MentionablePlayer) => {
    if (!mention) {
      return;
    }
    const before = value.slice(0, mention.start);
    const after = value.slice(caret);
    const inserted = `@${player.name} `;
    const next = `${before}${inserted}${after}`;
    onPick(player);
    onChange(next);
    const position = before.length + inserted.length;
    requestAnimationFrame(() => {
      textarea.current?.setSelectionRange(position, position);
      textarea.current?.focus();
      setCaret(position);
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
      return;
    }
    if (!open) {
      if (event.key === 'Escape') {
        onCancel?.();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected(
        (index) => (index - 1 + suggestions.length) % suggestions.length,
      );
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const player = suggestions[Math.min(selected, suggestions.length - 1)];
      if (player) {
        insert(player);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setDismissed(mention?.query ?? null);
    }
  };

  const track = () => setCaret(textarea.current?.selectionStart ?? 0);

  return (
    <div className="relative">
      <textarea
        aria-autocomplete="list"
        // biome-ignore lint/a11y/noAutofocus: the editor opens on request, focus is expected
        autoFocus={autoFocus}
        className={`${input} ${className}`}
        id={id}
        maxLength={maxLength}
        onChange={(event) => {
          onChange(event.target.value);
          setDismissed(null);
          setSelected(0);
          track();
        }}
        onClick={track}
        onKeyDown={onKeyDown}
        onKeyUp={track}
        placeholder={placeholder}
        ref={textarea}
        value={value}
      />
      {open ? (
        <div
          className="absolute bottom-full left-0 z-20 mb-1 flex min-w-48 flex-col overflow-hidden rounded-lg border border-(--hair-gold) bg-(--night-2) shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
          role="listbox"
        >
          {suggestions.map((player, index) => (
            <button
              aria-selected={index === selected}
              className={`w-full cursor-pointer px-3 py-1.5 text-left text-sm transition-colors ${
                index === selected
                  ? 'bg-(--gold)/15 text-(--gold-hi)'
                  : 'text-(--parchment) hover:bg-(--gold)/8'
              }`}
              key={player.id}
              onMouseDown={(event) => {
                event.preventDefault();
                insert(player);
              }}
              onMouseEnter={() => setSelected(index)}
              role="option"
              type="button"
            >
              @{player.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export { type MentionablePlayer, MentionComposer, useComposerBody };
