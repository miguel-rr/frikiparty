'use server';

import { ArmyViewSwitch } from '@/components/wiki/army-section';
import { TypeView } from '@/components/wiki/army-views';
import { db } from '@/server/db';
import { getFactionPage } from '@/server/wiki/queries';

/**
 * The faction's "Por tipo" view, rendered on demand: the static page only
 * carries the default "Por edificio" one.
 */
const loadTypeView = async (slug: string, version: string, code: string) => {
  const page = await getFactionPage(db, slug, version, code);
  if (!page) return null;
  return (
    <TypeView
      structures={page.structures}
      switcher={<ArmyViewSwitch />}
      units={page.units}
    />
  );
};

export { loadTypeView };
