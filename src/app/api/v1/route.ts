/** Version metadata only; no planned business endpoints are presented as ready. */
export function GET() {
  return Response.json({ data: { apiVersion: 'v1', stage: 'foundation' } }, { headers: { 'Cache-Control': 'no-store' } });
}
