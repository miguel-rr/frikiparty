import { pgTableCreator } from 'drizzle-orm/pg-core';

const createTable = pgTableCreator((name) => `frikiparty_${name}`);

export { createTable };
