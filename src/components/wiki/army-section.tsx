'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { btn } from '@/components/theme/primitives';

/** `building` (default, in the static page) mixes each structure with the units it trains; `type` groups units by category and structures by kind. */
type ArmyView = 'building' | 'type';

type ArmyViewState = {
  view: ArmyView;
  loading: boolean;
  choose: (view: ArmyView) => void;
};

const ArmyViewContext = createContext<ArmyViewState | null>(null);

const useArmyView = () => {
  const state = useContext(ArmyViewContext);
  if (!state) throw new Error('ArmyViewSwitch needs an ArmySection above it.');
  return state;
};

const OPTIONS: [ArmyView, string][] = [
  ['building', 'Por edificio'],
  ['type', 'Por tipo'],
];

/** "Ordenar: Por edificio · Por tipo". Rendered inside each view, under its summary table. */
const ArmyViewSwitch = () => {
  const { view, loading, choose } = useArmyView();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
        Ordenar
      </span>
      {OPTIONS.map(([key, label]) => (
        <button
          aria-pressed={key === view}
          className={`${btn.outline} ${key === view ? 'border-(--gold) bg-(--gold)/15 text-(--gold-hi)' : 'opacity-70'}`}
          disabled={loading}
          key={key}
          onClick={() => choose(key)}
          type="button"
        >
          {loading && key === 'type' ? 'Cargando…' : label}
        </button>
      ))}
    </div>
  );
};

/** Keeps `?view=type` in the address bar so the link can be shared. */
const writeViewToUrl = (view: ArmyView) => {
  const url = new URL(window.location.href);
  if (view === 'type') url.searchParams.set('view', 'type');
  else url.searchParams.delete('view');
  window.history.replaceState(window.history.state, '', url);
};

/**
 * The army block of a faction page. The building view comes in the static
 * page; the type view is rendered by the server the first time it is asked
 * for (the switch, or a shared `?view=type` link) and then kept.
 */
const ArmySection = ({
  building,
  loadTypeView,
}: {
  building: ReactNode;
  loadTypeView: () => Promise<ReactNode>;
}) => {
  const [view, setView] = useState<ArmyView>('building');
  const [typeView, setTypeView] = useState<ReactNode>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const choose = useCallback(
    (next: ArmyView) => {
      setFailed(false);
      if (next === 'building' || typeView) {
        setView(next);
        writeViewToUrl(next);
        return;
      }
      // Stay on the building view until the other one has arrived.
      setLoading(true);
      loadTypeView()
        .then((node) => {
          setTypeView(node);
          setView('type');
          writeViewToUrl('type');
        })
        .catch(() => setFailed(true))
        .finally(() => setLoading(false));
    },
    [loadTypeView, typeView],
  );

  // A shared `?view=type` link: the static page arrives, then the type view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on first load.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('view') === 'type')
      choose('type');
  }, []);

  const state = useMemo(
    () => ({ view, loading, choose }),
    [view, loading, choose],
  );

  return (
    <ArmyViewContext.Provider value={state}>
      <div className="flex scroll-mt-24 flex-col gap-4" id="army">
        {failed ? (
          <p className="text-center text-(--ember) text-xs">
            No se pudo cargar la vista por tipo. Prueba otra vez.
          </p>
        ) : null}
        {view === 'type' && typeView ? typeView : building}
      </div>
    </ArmyViewContext.Provider>
  );
};

export { ArmySection, ArmyViewSwitch };
