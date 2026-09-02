import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CopyCodeButton } from '@/app/admin/players/_components/copy-code-button';
import { SiteShell } from '@/components/layout/site-shell';
import {
  panelGold,
  Section,
  SectionHeader,
  tag,
  td,
  th,
} from '@/components/theme/primitives';
import { formatLinkCode } from '@/lib/link-code';
import { listPlayersForAdmin } from '@/server/api/routers/player';
import { getSession } from '@/server/better-auth/server';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'Jugadores — Frikiparty' };

// Reads the session: always rendered on demand, never built statically.
export const dynamic = 'force-dynamic';

/**
 * Admin roster: who has claimed their player and, for those who haven't,
 * the one-time code to hand them. Non-admins get a 404 rather than a
 * "forbidden", so the page doesn't advertise itself.
 */
const AdminPlayersPage = async () => {
  const session = await getSession();
  if (session?.user.role !== 'admin') {
    notFound();
  }
  const players = await listPlayersForAdmin(db);
  const linked = players.filter((row) => row.user !== null).length;

  return (
    <SiteShell>
      <main>
        <Section id="admin-players">
          <SectionHeader
            eyebrowText="Administración"
            lead={`${linked} de ${players.length} han reclamado su jugador. Los demás necesitan el código de su fila: lo introducen en "Vincular jugador", en su menú de usuario.`}
            title="Jugadores"
          />
          <div className={`${panelGold} mt-10 overflow-x-auto`}>
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>Jugador</th>
                  <th className={th}>Usuario</th>
                  <th className={th}>Código</th>
                </tr>
              </thead>
              <tbody>
                {players.map((row) => (
                  <tr key={row.id}>
                    <td className={td}>
                      <Link
                        className="font-bold text-(--parchment) transition-colors hover:text-(--gold-hi)"
                        href={`/players/${row.slug}`}
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className={td}>
                      {row.user ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-(--parchment)">
                            {row.user.name}
                          </span>
                          <span className="text-(--faded) text-xs">
                            {row.user.email}
                          </span>
                          {row.user.role !== 'user' ? (
                            <span className={tag}>{row.user.role}</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-(--faded)">Sin vincular</span>
                      )}
                    </td>
                    <td className={td}>
                      {row.linkCode ? (
                        <CopyCodeButton code={formatLinkCode(row.linkCode)} />
                      ) : (
                        <span className="text-(--faded)">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </main>
    </SiteShell>
  );
};

export default AdminPlayersPage;
