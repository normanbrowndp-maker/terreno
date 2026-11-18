import { z } from 'zod';

const databaseUrl = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol) && Boolean(url.hostname) && url.pathname.length > 1;
  } catch { return false; }
});

export function parseServerConfig(env: Record<string, string | undefined>): { databaseUrl: string | undefined } {
  const result = databaseUrl.optional().safeParse(env.DATABASE_URL);
  if (!result.success) throw new Error('Invalid server configuration: DATABASE_URL');
  return { databaseUrl: result.data };
}
