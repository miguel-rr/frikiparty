'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import {
  AuthorMedallion,
  AuthorName,
} from '@/components/social/author-medallion';
import {
  type MentionablePlayer,
  MentionComposer,
  useComposerBody,
} from '@/components/social/mention-composer';
import type { SocialTarget } from '@/components/social/target';
import { btn } from '@/components/theme/primitives';
import { parseBody } from '@/lib/social/mentions';
import { api } from '@/trpc/react';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const quiet =
  'cursor-pointer rounded-full px-2 py-0.5 font-mono text-(--faded) text-[0.58rem] uppercase tracking-[0.16em] transition-colors hover:text-(--gold-hi)';

/** Plain text with line breaks; mentions become links to the player. */
const CommentBody = ({ body }: { body: string }) => (
  <p className="whitespace-pre-line text-(--parchment) text-sm leading-relaxed">
    {parseBody(body).map((segment, index) =>
      segment.kind === 'mention' ? (
        <Link
          className="font-bold text-(--gold) transition-colors hover:text-(--gold-hi)"
          href={`/players/${segment.slug}`}
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
          key={index}
        >
          @{segment.name}
        </Link>
      ) : (
        // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
        <span key={index}>{segment.text}</span>
      ),
    )}
  </p>
);

/** Textarea plus Publicar/Cancelar; used to write and to edit in place. */
const Composer = ({
  players,
  initialBody = '',
  placeholder,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
  id,
  autoFocus = false,
}: {
  players: MentionablePlayer[];
  initialBody?: string;
  placeholder: string;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (body: string) => void;
  onCancel?: () => void;
  id: string;
  autoFocus?: boolean;
}) => {
  const composer = useComposerBody(initialBody);
  const submit = () => {
    const body = composer.serialize();
    if (body.length > 0 && !pending) {
      onSubmit(body);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <MentionComposer
        autoFocus={autoFocus}
        id={id}
        onCancel={onCancel}
        onChange={composer.setText}
        onPick={composer.pick}
        onSubmit={submit}
        placeholder={placeholder}
        players={players}
        value={composer.text}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={`${btn.primary} px-5 py-1.5 text-xs`}
          disabled={pending || composer.text.trim().length === 0}
          onClick={submit}
          type="button"
        >
          {pending ? 'Guardando…' : submitLabel}
        </button>
        {onCancel ? (
          <button
            className={`${btn.ghost} text-xs`}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
        ) : null}
        <span className="text-(--faded) text-[0.65rem]">
          @ para mencionar · Ctrl+Enter para enviar
        </span>
        {error ? <span className="text-(--ember) text-xs">{error}</span> : null}
      </div>
    </div>
  );
};

/**
 * The conversation under a file (or, later, an edition or a player):
 * oldest first, the box to write at the end. Authors edit and remove
 * their own; admins remove anyone's. Removal confirms in place.
 */
const CommentThread = ({ target }: { target: SocialTarget }) => {
  const { user } = useSessionUser();
  const router = useRouter();
  const utils = api.useUtils();
  const thread = api.social.comments.useQuery(target);
  const players = api.player.list.useQuery();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [composerKey, setComposerKey] = useState(0);

  // Counts live on the gallery items and on the dynamic /archive pages.
  const settled = () => {
    utils.social.comments.invalidate(target);
    utils.media.gallery.invalidate();
    router.refresh();
  };
  const add = api.social.addComment.useMutation({
    onSuccess: () => {
      setComposerKey((key) => key + 1);
      settled();
    },
  });
  const edit = api.social.editComment.useMutation({
    onSuccess: () => {
      setEditingId(null);
      settled();
    },
  });
  const remove = api.social.removeComment.useMutation({
    onSuccess: () => {
      setConfirmingId(null);
      settled();
    },
  });

  const isAdmin = user?.role === 'admin';
  const comments = thread.data ?? [];
  const mentionable = players.data ?? [];

  return (
    <section
      aria-label="Comentarios"
      className="flex flex-col gap-4 border-(--hair) border-t pt-4"
    >
      <span className="font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]">
        Comentarios
        {comments.length > 0 ? (
          <span className="text-(--gold)"> · {comments.length}</span>
        ) : null}
      </span>
      {thread.isPending ? (
        <p className="text-(--faded) text-sm italic">Cargando…</p>
      ) : comments.length === 0 ? (
        <p className="text-(--faded) text-sm italic">
          Nadie ha dicho nada todavía. Sé el primero.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {comments.map((item) => {
            const mine = user?.id === item.author.userId;
            return (
              <li className="flex gap-3" key={item.id}>
                <AuthorMedallion author={item.author} size="md" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <AuthorName author={item.author} className="text-sm" />
                    <span className="font-mono text-(--faded) text-[0.6rem] uppercase tracking-[0.12em]">
                      {formatDateTime(item.createdAt)}
                      {item.editedAt ? ' · editado' : ''}
                    </span>
                  </div>
                  {editingId === item.id ? (
                    <Composer
                      autoFocus
                      error={edit.error?.message ?? null}
                      id={`comment-edit-${item.id}`}
                      initialBody={item.body}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(body) => edit.mutate({ id: item.id, body })}
                      pending={edit.isPending}
                      placeholder=""
                      players={mentionable}
                      submitLabel="Guardar"
                    />
                  ) : (
                    <CommentBody body={item.body} />
                  )}
                  {editingId !== item.id && (mine || isAdmin) ? (
                    <div className="-ml-2 flex flex-wrap items-center gap-1">
                      {mine ? (
                        <button
                          className={quiet}
                          onClick={() => {
                            setConfirmingId(null);
                            setEditingId(item.id);
                          }}
                          type="button"
                        >
                          Editar
                        </button>
                      ) : null}
                      {confirmingId === item.id ? (
                        <>
                          <span className="px-1 text-(--ember) text-xs">
                            ¿Borrar este comentario?
                          </span>
                          <button
                            className={`${quiet} text-(--ember) hover:text-(--ember)`}
                            disabled={remove.isPending}
                            onClick={() => remove.mutate({ id: item.id })}
                            type="button"
                          >
                            {remove.isPending ? 'Borrando…' : 'Sí, borrar'}
                          </button>
                          <button
                            className={quiet}
                            onClick={() => setConfirmingId(null)}
                            type="button"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          className={`${quiet} hover:text-(--ember)`}
                          onClick={() => setConfirmingId(item.id)}
                          type="button"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <Composer
        error={add.error?.message ?? null}
        id={`comment-new-${'mediaId' in target ? target.mediaId : 'editionId' in target ? target.editionId : target.playerId}`}
        key={composerKey}
        onSubmit={(body) => add.mutate({ target, body })}
        pending={add.isPending}
        placeholder="Escribe un comentario…"
        players={mentionable}
        submitLabel="Publicar"
      />
    </section>
  );
};

export { CommentThread };
