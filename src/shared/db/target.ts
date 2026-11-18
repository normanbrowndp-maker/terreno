export type DatabasePurpose = 'development' | 'test' | 'runtime' | 'restore';

/** Guard every local writer before constructing a client. Never echo the URL. */
export function assertLocalDatabaseTarget(value: string, purpose: DatabasePurpose): { database: string; username: string; port: number } {
  const unsafe = () => new Error('Unsafe database target');
  let url: URL;
  try { url = new URL(value); } catch { throw unsafe(); }
  let database: string, username: string;
  try { database = decodeURIComponent(url.pathname.slice(1)); username = decodeURIComponent(url.username); } catch { throw unsafe(); }
  const isTest = database === 'travel_test_foundation';
  const validDatabase = purpose === 'restore' ? /^travel_test_restore(?:_[a-z0-9_]+)?$/.test(database) : purpose === 'test' ? isTest : purpose === 'development' ? database === 'travel_dev' : isTest || database === 'travel_dev';
  const validRole = purpose === 'test' || purpose === 'restore' ? username === 'travel_test_migrator'
    : purpose === 'development' ? username === 'travel_migrator'
    : isTest ? username === 'travel_test_runtime' : username === 'travel_runtime';
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || !['127.0.0.1', '[::1]'].includes(url.hostname)
      || !['55432', '55433'].includes(url.port)
      || url.search !== '' || url.hash !== '' || !validDatabase || !validRole) throw unsafe();
  return { database, username, port: Number(url.port) };
}
