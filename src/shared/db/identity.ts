import type { ClientBase } from 'pg';

export async function assertDatabaseIdentity(db: Pick<ClientBase, 'query'>, purpose: 'development' | 'test' | 'restore', expected = process.env.TRAVEL_DATABASE_ID): Promise<void> {
  if (!expected || !/^travel_[a-z0-9_]+$/.test(expected)) throw new Error('Project database identity is required');
  try {
    const result = await db.query<{ project_id: string; purpose: string; cluster_name: string }>(
      "SELECT project_id,purpose,current_setting('cluster_name') AS cluster_name FROM public.travel_database_identity",
    );
    if (result.rowCount !== 1 || result.rows[0]?.project_id !== expected || result.rows[0]?.cluster_name !== expected || result.rows[0]?.purpose !== purpose) throw new Error('Mismatch');
  } catch { throw new Error('Project database identity mismatch'); }
}
