'use client';

import { useEffect, useRef, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Copies with the async clipboard when the page has it (https, granted),
 * and otherwise the old way: select the code and execCommand('copy'),
 * which still works on http and on older mobile browsers.
 */
const copyText = (text: string, node: HTMLElement | null) => {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
  }
  if (!node) {
    return Promise.resolve(false);
  }
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  selection?.removeAllRanges();
  selection?.addRange(range);
  let done = false;
  try {
    done = document.execCommand('copy');
  } catch {
    done = false;
  }
  return Promise.resolve(done);
};

/**
 * The code in mono type next to a Copiar button; the label says so for
 * a moment. When copying fails the code is left selected and the label
 * says so — and the code itself is always selectable by hand.
 */
const CopyCodeButton = ({ code }: { code: string }) => {
  const [state, setState] = useState<CopyState>('idle');
  const codeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (state === 'idle') {
      return;
    }
    const timer = setTimeout(() => setState('idle'), 1800);
    return () => clearTimeout(timer);
  }, [state]);

  const handleCopy = async () => {
    const done = await copyText(code, codeRef.current);
    setState(done ? 'copied' : 'failed');
    if (!done) {
      // Leave the code selected as the fallback for the person.
      const selection = window.getSelection();
      const range = document.createRange();
      if (codeRef.current) {
        range.selectNodeContents(codeRef.current);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-(--hair) py-1 pr-2 pl-2.5 font-mono text-(--gold) text-sm tracking-2xl">
      {/* Plain text, not part of the button, so a long press on a phone
          can select it: select-all takes the whole code in one go, and
          the selection is painted gold so it's obviously grabbed. */}
      <span
        className="cursor-text select-all selection:bg-(--gold) selection:text-[#211803]"
        ref={codeRef}
      >
        {code}
      </span>
      <button
        className={`cursor-pointer rounded px-1 font-sans text-2xs uppercase tracking-2xl transition-colors ${
          state === 'failed'
            ? 'text-(--ember)'
            : 'text-(--faded) hover:text-(--gold-hi)'
        }`}
        onClick={handleCopy}
        title="Copiar código"
        type="button"
      >
        {state === 'copied'
          ? 'Copiado'
          : state === 'failed'
            ? 'Cópialo a mano'
            : 'Copiar'}
      </button>
    </span>
  );
};

export { CopyCodeButton };
