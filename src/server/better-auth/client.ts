import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const authClient = createAuthClient({ plugins: [adminClient()] });

type Session = typeof authClient.$Infer.Session;

export { authClient, type Session };
