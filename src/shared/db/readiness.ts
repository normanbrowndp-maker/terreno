export async function readiness(check: (() => Promise<void>) | undefined): Promise<Response> {
  const options = { headers: { 'Cache-Control': 'no-store' } };
  try {
    if (!check) throw new Error('Database not configured');
    await check();
    return Response.json({ status: 'ready' }, options);
  } catch {
    return Response.json({ status: 'not_ready' }, { ...options, status: 503 });
  }
}
