export type DatabasePurpose = 'development' | 'test' | 'runtime';

/** Guard every local writer before constructing a client. Never echo the URL. */
export function assertLocalDatabaseTarget(value: string, purpose: DatabasePurpose): { database: string; username: string; port: number } {
  const unsafe = () => new Error('Unsafe database target');
  let url: URL;
  try { url = new URL(value); } catch { throw unsafe(); }
  const database = decodeURIComponent(url.pathname.slice(1));
  const username = decodeURIComponent(url.username);
  const isTest = /^travel_test_[a-z0-9_]+$/.test(database);
  const validDatabase = purpose === 'test' ? isTest : purpose === 'development' ? database === 'travel_dev' : isTest || database === 'travel_dev';
  const validRole = purpose === 'test' ? username === 'travel_test_migrator'
    : purpose === 'development' ? username === 'travel_migrator'
    : isTest ? username === 'travel_test_runtime' : username === 'travel_runtime';
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || !['55432', '55433'].includes(url.port)
      || url.search !== '' || url.hash !== '' || !validDatabase || !validRole) throw unsafe();
  return { database, username, port: Number(url.port) };
}
