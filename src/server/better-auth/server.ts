import { headers } from 'next/headers';
import { cache } from 'react';
import { auth } from '.';

const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export { getSession };
