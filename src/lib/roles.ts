/**
 * Account roles. better-auth's admin plugin stores several roles in one
 * `user.role` column, comma-separated ("editor,translator"), and splits on
 * the comma when it checks permissions; every role check in the app goes
 * through here so a multi-role account is read the same way.
 */

const ROLES = [
  { value: 'editor', text: 'Editor' },
  { value: 'translator', text: 'Traductor' },
  { value: 'admin', text: 'Admin' },
] as const;

type RoleName = (typeof ROLES)[number]['value'];

/** Anything carrying a role string: a session user, a DB row, `{ role }`. */
type RoleBearer = { role?: string | null } | null | undefined;

/** The roles an account holds; the plain `user` account holds none. */
const rolesOf = (bearer: RoleBearer): RoleName[] => {
  const raw = bearer?.role ?? '';
  const names = ROLES.map((r) => r.value as string);
  return raw
    .split(',')
    .map((r) => r.trim())
    .filter((r): r is RoleName => names.includes(r));
};

const hasRole = (bearer: RoleBearer, role: RoleName) =>
  rolesOf(bearer).includes(role);

const isAdmin = (bearer: RoleBearer) => hasRole(bearer, 'admin');

/** Admins and editors: the archive's moderators, the live module's helpers. */
const canModerate = (bearer: RoleBearer) =>
  isAdmin(bearer) || hasRole(bearer, 'editor');

/** Admins and translators: the lotr.str module. */
const canTranslate = (bearer: RoleBearer) =>
  isAdmin(bearer) || hasRole(bearer, 'translator');

/** The column value for a set of roles; no role at all is the plain user. */
const joinRoles = (roles: readonly RoleName[]) => {
  const ordered = ROLES.map((r) => r.value).filter((r) => roles.includes(r));
  return ordered.length === 0 ? 'user' : ordered.join(',');
};

export {
  canModerate,
  canTranslate,
  hasRole,
  isAdmin,
  joinRoles,
  ROLES,
  type RoleBearer,
  type RoleName,
  rolesOf,
};
