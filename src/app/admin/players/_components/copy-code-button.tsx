'use client';

import { useEffect, useState } from 'react';

/** The code in mono type; a tap copies it, and the label says so for a moment. */
const CopyCodeButton = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard blocked (http, permissions): the code is still selectable.
    }
  };

  return (
    <button
      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-(--hair) px-2.5 py-1 font-mono text-(--gold) text-sm tracking-2xl transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi)"
      onClick={handleCopy}
      title="Copiar código"
      type="button"
    >
      {code}
      <span className="font-sans text-(--faded) text-2xs uppercase tracking-2xl">
        {copied ? 'Copiado' : 'Copiar'}
      </span>
    </button>
  );
};

export { CopyCodeButton };
