'use client';

import { useRouter } from 'next/navigation';

import { api } from '@/trpc/react';

const ROLES = [
  { value: 'user', text: 'Usuario' },
  { value: 'editor', text: 'Editor' },
  { value: 'admin', text: 'Admin' },
] as const;

type Role = (typeof ROLES)[number]['value'];

/**
 * The account's role, saved on change. Editors may upload without a
 * player; admins run the site. Your own row is locked so you can't lock
 * yourself out.
 */
const RoleSelect = ({
  isSelf,
  role,
  userId,
}: {
  isSelf: boolean;
  role: string;
  userId: string;
}) => {
  const router = useRouter();
  const utils = api.useUtils();
  const setRole = api.player.setUserRole.useMutation({
    onSuccess: () => {
      utils.media.access.invalidate();
      router.refresh();
    },
  });

  return (
    <span className="inline-flex items-center gap-2">
      <select
        aria-label="Rol"
        className={`appearance-none rounded-full border px-2.5 py-1 font-mono text-2xs uppercase tracking-2xl transition-colors focus:outline-none ${
          role === 'user'
            ? 'border-(--hair) bg-(--night-2) text-(--faded) hover:border-(--hair-gold)'
            : 'border-(--hair-gold) bg-(--night-2) text-(--gold) hover:border-(--gold)'
        } disabled:cursor-not-allowed disabled:opacity-70`}
        disabled={isSelf || setRole.isPending}
        onChange={(event) =>
          setRole.mutate({ userId, role: event.target.value as Role })
        }
        title={isSelf ? 'Tu propio rol no se cambia desde aquí' : undefined}
        value={role}
      >
        {ROLES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.text}
          </option>
        ))}
      </select>
      {setRole.error ? (
        <span className="text-(--ember) text-xs">{setRole.error.message}</span>
      ) : null}
    </span>
  );
};

export { RoleSelect };
