'use client';

import { useRouter } from 'next/navigation';

import { ROLES, type RoleName, rolesOf } from '@/lib/roles';
import { api } from '@/trpc/react';

const chip =
  'cursor-pointer rounded-full border px-2.5 py-1 font-mono text-2xs uppercase tracking-2xl transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-70';
const chipOff =
  'border-(--hair) bg-(--night-2) text-(--faded) hover:border-(--hair-gold)';
const chipOn =
  'border-(--hair-gold) bg-(--night-2) text-(--gold) hover:border-(--gold)';

/**
 * The account's roles as toggles, saved on change; an account may hold
 * several (editor and translator, say). Editors may upload without a
 * player; translators keep the lotr.str; admins run the site. Your own
 * admin toggle is locked so you can't lock yourself out.
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
  const held = rolesOf({ role });
  const setRole = api.player.setUserRole.useMutation({
    onSuccess: () => {
      utils.media.access.invalidate();
      router.refresh();
    },
  });
  const toggle = (name: RoleName) => {
    const roles = held.includes(name)
      ? held.filter((r) => r !== name)
      : [...held, name];
    setRole.mutate({ userId, roles });
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {ROLES.map((option) => {
        const on = held.includes(option.value);
        const locked = isSelf && option.value === 'admin';
        return (
          <button
            aria-pressed={on}
            className={`${chip} ${on ? chipOn : chipOff}`}
            disabled={locked || setRole.isPending}
            key={option.value}
            onClick={() => toggle(option.value)}
            title={
              locked ? 'Tu propio admin no se quita desde aquí' : undefined
            }
            type="button"
          >
            {option.text}
          </button>
        );
      })}
      {setRole.error ? (
        <span className="text-(--ember) text-xs">{setRole.error.message}</span>
      ) : null}
    </span>
  );
};

export { RoleSelect };
