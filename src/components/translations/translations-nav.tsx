'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/translations', text: 'Cadenas' },
  { href: '/translations/files', text: 'Ficheros' },
  { href: '/translations/compare', text: 'Comparar' },
  { href: '/translations/export', text: 'Exportar' },
] as const;

const base =
  'rounded-full border px-4 py-1.5 font-mono text-2xs font-bold uppercase tracking-2xl transition-colors';
const on = 'border-(--hair-gold) bg-(--night-2) text-(--gold)';
const off =
  'border-(--hair) text-(--faded) hover:border-(--hair-gold) hover:text-(--gold-hi)';

/** The module's four desks. */
const TranslationsNav = () => {
  const pathname = usePathname();
  return (
    <nav aria-label="Traducciones" className="mb-6 flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          className={`${base} ${pathname === tab.href ? on : off}`}
          href={tab.href}
          key={tab.href}
        >
          {tab.text}
        </Link>
      ))}
    </nav>
  );
};

export { TranslationsNav };
