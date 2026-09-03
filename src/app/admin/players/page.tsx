import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CopyCodeButton } from '@/app/admin/players/_components/copy-code-button';
import { LinkUserRow } from '@/app/admin/players/_components/link-user-row';
import { RoleSelect } from '@/app/admin/players/_components/role-select';
import { UnlinkButton } from '@/app/admin/players/_components/unlink-button';
import { SiteShell } from '@/components/layout/site-shell';
import {
  panelGold,
  Section,
  SectionHeader,
  td,
  th,
} from '@/components/theme/primitives';
import { formatLinkCode } from '@/lib/link-code';
import {
  listPlayersForAdmin,
  listUnlinkedUsers,
} from '@/server/api/routers/player';
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
  const selfId = session.user.id;
  const [players, unlinked] = await Promise.all([
    listPlayersForAdmin(db),
    listUnlinkedUsers(db),
  ]);
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
                          <RoleSelect
                            isSelf={row.user.id === selfId}
                            role={row.user.role}
                            userId={row.user.id}
                          />
                          <UnlinkButton
                            playerId={row.id}
                            playerName={row.name}
                          />
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

          {/* Accounts that signed in but never claimed a player: the
              admin can match them here without handing out a code. */}
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="d-display font-bold text-(--parchment) text-xl uppercase">
                Cuentas sin jugador
              </h2>
              <p className="text-(--faded) text-sm">
                {unlinked.users.length === 0
                  ? 'Todas las cuentas registradas tienen ya su jugador.'
                  : 'Han entrado en la web pero no han introducido ningún código. Elige a quién corresponde cada una.'}
              </p>
            </div>
            {unlinked.users.length > 0 ? (
              <div className={`${panelGold} overflow-x-auto`}>
                <table className="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className={th}>Cuenta</th>
                      <th className={th}>Desde</th>
                      <th className={th}>Jugador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unlinked.users.map((account) => (
                      <tr key={account.id}>
                        <td className={td}>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-(--parchment)">
                              {account.name}
                            </span>
                            <span className="text-(--faded) text-xs">
                              {account.email}
                            </span>
                            <RoleSelect
                              isSelf={account.id === selfId}
                              role={account.role}
                              userId={account.id}
                            />
                          </span>
                        </td>
                        <td
                          className={`${td} font-mono text-(--faded) text-xs`}
                        >
                          {account.createdAt.toLocaleDateString('es-ES')}
                        </td>
                        <td className={td}>
                          <LinkUserRow
                            freePlayers={unlinked.freePlayers}
                            userId={account.id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </Section>
      </main>
    </SiteShell>
  );
};

export default AdminPlayersPage;
