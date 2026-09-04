'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import { btn, input, label, panelGold } from '@/components/theme/primitives';
import { api } from '@/trpc/react';

/**
 * Admin-only "Nueva edición" on the chronicle: unfolds a small form (year,
 * number within the year, venue, dates) and lands on the new page, where
 * the full editor takes over for rosters and pots.
 */
const NewEditionButton = () => {
  const router = useRouter();
  const { user } = useSessionUser();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [order, setOrder] = useState('1');
  const [venueId, setVenueId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const venues = api.venue.list.useQuery(undefined, { enabled: open });
  const create = api.edition.create.useMutation({
    onSuccess: ({ slug }) => router.push(`/editions/${slug}`),
  });

  if (user?.role !== 'admin') {
    return null;
  }
  if (!open) {
    return (
      <div className="flex justify-end">
        <button
          className={`${btn.secondary} px-4 py-1.5 text-sm`}
          onClick={() => setOpen(true)}
          type="button"
        >
          Nueva edición
        </button>
      </div>
    );
  }
  return (
    <form
      className={`${panelGold} flex flex-col gap-4 p-5 sm:p-6`}
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({
          year: Number(year),
          order: Number(order),
          venueId: venueId || null,
          startsAt: startsAt || null,
          endsAt: endsAt || null,
        });
      }}
    >
      <span className="font-bold font-mono text-(--gold) text-2xs uppercase tracking-2xl">
        Nueva edición
      </span>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className={label} htmlFor="new-edition-year">
            Año
          </label>
          <input
            className={input}
            id="new-edition-year"
            inputMode="numeric"
            max={2100}
            min={2000}
            onChange={(event) => setYear(event.target.value)}
            required
            type="number"
            value={year}
          />
        </div>
        <div>
          <label className={label} htmlFor="new-edition-order">
            Número en el año
          </label>
          <input
            className={input}
            id="new-edition-order"
            inputMode="numeric"
            max={5}
            min={1}
            onChange={(event) => setOrder(event.target.value)}
            required
            type="number"
            value={order}
          />
        </div>
        <div>
          <label className={label} htmlFor="new-edition-starts">
            Empieza
          </label>
          <input
            className={input}
            id="new-edition-starts"
            onChange={(event) => setStartsAt(event.target.value)}
            type="date"
            value={startsAt}
          />
        </div>
        <div>
          <label className={label} htmlFor="new-edition-ends">
            Termina
          </label>
          <input
            className={input}
            id="new-edition-ends"
            onChange={(event) => setEndsAt(event.target.value)}
            type="date"
            value={endsAt}
          />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="new-edition-venue">
          Sede
        </label>
        <select
          className={`${input} appearance-none`}
          id="new-edition-venue"
          onChange={(event) => setVenueId(event.target.value)}
          value={venueId}
        >
          <option value="">Sin sede</option>
          {venues.data?.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </div>
      {create.error ? (
        <p className="text-(--ember) text-sm" role="alert">
          {create.error.message}
        </p>
      ) : null}
      <div className="flex justify-end gap-2.5">
        <button
          className={`${btn.ghost} px-4 py-1.5 text-sm`}
          onClick={() => setOpen(false)}
          type="button"
        >
          Cancelar
        </button>
        <button
          className={`${btn.primary} px-5 py-1.5 text-sm`}
          disabled={create.isPending}
          type="submit"
        >
          {create.isPending ? 'Creando…' : 'Crear edición'}
        </button>
      </div>
    </form>
  );
};

export { NewEditionButton };
