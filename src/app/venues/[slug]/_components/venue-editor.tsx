'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import { btn, input, label, panelGold } from '@/components/theme/primitives';
import { api } from '@/trpc/react';

type VenueEditorProps = {
  venue: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    mapsUrl: string | null;
    mapsEmbedQuery: string | null;
    photoUrl: string | null;
  };
};

/**
 * Admin-only inline editor, same pattern as the player profile: a quiet
 * Editar button that unfolds the fields; Guardar persists and refreshes.
 * Renaming moves the page to its new slug; unchecking "es una sede real"
 * takes the page down and returns to the index.
 */
const VenueEditor = ({ venue }: VenueEditorProps) => {
  const router = useRouter();
  // Client-side gate so the page stays static; the mutation re-checks.
  const { user } = useSessionUser();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(venue.name);
  const [description, setDescription] = useState(venue.description ?? '');
  const [mapsUrl, setMapsUrl] = useState(venue.mapsUrl ?? '');
  const [mapsEmbedQuery, setMapsEmbedQuery] = useState(
    venue.mapsEmbedQuery ?? '',
  );
  const [photoUrl, setPhotoUrl] = useState(venue.photoUrl ?? '');
  const [isPlace, setIsPlace] = useState(true);

  const update = api.venue.update.useMutation({
    onSuccess: (updated) => {
      setEditing(false);
      if (!updated.isPlace) {
        router.push('/venues');
        return;
      }
      if (updated.slug !== venue.slug) {
        router.replace(`/venues/${updated.slug}`);
        return;
      }
      router.refresh();
    },
  });

  const cancel = () => {
    setName(venue.name);
    setDescription(venue.description ?? '');
    setMapsUrl(venue.mapsUrl ?? '');
    setMapsEmbedQuery(venue.mapsEmbedQuery ?? '');
    setPhotoUrl(venue.photoUrl ?? '');
    setIsPlace(true);
    setEditing(false);
  };

  if (user?.role !== 'admin') {
    return null;
  }

  if (!editing) {
    return (
      <div className="flex justify-end">
        <button
          className={`${btn.secondary} px-4 py-1.5 text-sm`}
          onClick={() => setEditing(true)}
          type="button"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <form
      className={`${panelGold} flex flex-col gap-4 p-5 sm:p-6`}
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate({
          id: venue.id,
          name,
          description: description.trim() || null,
          mapsUrl: mapsUrl.trim() || null,
          mapsEmbedQuery: mapsEmbedQuery.trim() || null,
          photoUrl: photoUrl.trim() || null,
          isPlace,
        });
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="venue-name">
            Nombre
          </label>
          <input
            className={input}
            id="venue-name"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </div>
        <div>
          <label className={label} htmlFor="venue-photo">
            URL de la foto
          </label>
          <input
            className={input}
            id="venue-photo"
            onChange={(event) => setPhotoUrl(event.target.value)}
            placeholder="https://…"
            type="url"
            value={photoUrl}
          />
        </div>
        <div>
          <label className={label} htmlFor="venue-maps">
            URL de Google Maps
          </label>
          <input
            className={input}
            id="venue-maps"
            onChange={(event) => setMapsUrl(event.target.value)}
            placeholder="https://maps.app.goo.gl/…"
            type="url"
            value={mapsUrl}
          />
        </div>
        <div>
          <label className={label} htmlFor="venue-embed">
            Dirección para el mapa embebido
          </label>
          <input
            className={input}
            id="venue-embed"
            onChange={(event) => setMapsEmbedQuery(event.target.value)}
            placeholder="Casa, 00000 Pueblo, Provincia"
            value={mapsEmbedQuery}
          />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="venue-description">
          Descripción
        </label>
        <textarea
          className={`${input} min-h-28`}
          id="venue-description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Cómo era la casa, anécdotas, por qué se dejó de ir…"
          value={description}
        />
      </div>
      <label className="flex items-center gap-2.5 text-(--faded) text-sm">
        <input
          checked={isPlace}
          className="size-4 accent-(--gold)"
          onChange={(event) => setIsPlace(event.target.checked)}
          type="checkbox"
        />
        Es una sede real (al desmarcarla, esta ficha desaparece)
      </label>
      {update.error ? (
        <p className="text-(--ember) text-sm" role="alert">
          {update.error.message}
        </p>
      ) : null}
      <div className="flex justify-end gap-2.5">
        <button
          className={`${btn.ghost} px-4 py-1.5 text-sm`}
          onClick={cancel}
          type="button"
        >
          Cancelar
        </button>
        <button
          className={`${btn.primary} px-5 py-1.5 text-sm`}
          disabled={update.isPending}
          type="submit"
        >
          {update.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export { VenueEditor };
