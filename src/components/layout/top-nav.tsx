'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { btn } from '@/components/theme/primitives';

type NavLink = { href: string; text: string };

const DEFAULT_LINKS: NavLink[] = [
  { href: '#champions', text: 'Ediciones' },
  { href: '#ranking', text: 'Ranking' },
  { href: '#contest', text: 'Torneo' },
  { href: '#auction', text: 'El Pifouds' },
];

const navLinkClass =
  'd-display font-bold text-[0.78rem] text-(--faded) uppercase tracking-[0.18em] transition-colors hover:text-(--gold-hi)';

/**
 * Sticky nav; below md the links live behind a hamburger dropdown.
 * `links={[]}` hides the link row and the hamburger; `authSlot={null}`
 * hides the auth area entirely (undefined keeps the default "Entrar").
 */
const TopNav = ({
  authSlot,
  links = DEFAULT_LINKS,
}: {
  authSlot?: ReactNode;
  links?: NavLink[];
}) => {
  const [open, setOpen] = useState(false);
  const hasLinks = links.length > 0;
  return (
    <nav className="sticky top-0 z-40 border-(--hair) border-b bg-[#0a0f0cd1] backdrop-blur-md">
      {/* Symmetric flex-1 flanks keep the link row truly centered no matter how wide the auth area is. */}
      <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex flex-1 items-center">
          <Link
            className="d-display d-gold-text font-black text-lg tracking-[0.18em]"
            href="/"
          >
            FRIKIPARTY
          </Link>
        </div>
        <div className="hidden items-center gap-7 md:flex">
          {links.map(({ href, text }) => (
            <Link className={navLinkClass} href={href} key={href}>
              {text}
            </Link>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2.5">
          {authSlot === undefined ? (
            <a className={`${btn.primary} px-4 py-1.5 text-sm`} href="#top">
              Entrar
            </a>
          ) : (
            authSlot
          )}
          {hasLinks ? (
            <button
              aria-expanded={open}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              className="grid size-9 place-items-center rounded-full border border-(--hair) text-(--gold) transition-colors hover:border-(--hair-gold) md:hidden"
              onClick={() => setOpen((value) => !value)}
              type="button"
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
                viewBox="0 0 16 16"
                width="16"
              >
                {open ? (
                  <>
                    <path d="M3 3l10 10" />
                    <path d="M13 3L3 13" />
                  </>
                ) : (
                  <>
                    <path d="M2 4h12" />
                    <path d="M2 8h12" />
                    <path d="M2 12h12" />
                  </>
                )}
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      {open ? (
        <div className="border-(--hair) border-t bg-[#0d1310f2] md:hidden">
          <div className="mx-auto flex max-w-[1180px] flex-col px-4 sm:px-6">
            {links.map(({ href, text }) => (
              <Link
                className={`${navLinkClass} border-(--hair) border-b py-3.5 last:border-b-0`}
                href={href}
                key={href}
                onClick={() => setOpen(false)}
              >
                {text}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  );
};

export { TopNav };
