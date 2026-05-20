import type { Config } from 'drizzle-kit';

const url = process.env['TURSO_DATABASE_URL'] ?? 'file:./local.db';
const authToken = process.env['TURSO_AUTH_TOKEN'];

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'turso',
  dbCredentials: authToken
    ? { url, authToken }
    : { url },
} satisfies Config;
