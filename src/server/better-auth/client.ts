import { createAuthClient } from 'better-auth/react';

const authClient = createAuthClient();

type Session = typeof authClient.$Infer.Session;

export { authClient, type Session };
