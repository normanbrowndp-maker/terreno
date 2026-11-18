interface Finding { nodes: string[]; via: (string | { url: string })[] }
export function assessDependencyAudit(findings: Record<string, Finding>, packages: Record<string, { dev?: boolean }>, today: string): { blocked: string[]; reviewed: string[] } {
  const known = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
  const result = { blocked: [] as string[], reviewed: [] as string[] };
  const urls = (name: string, seen = new Set<string>()): string[] => {
    if (seen.has(name) || !findings[name]) return ['unresolved'];
    const next = new Set(seen).add(name);
    return findings[name].via.flatMap((via) => typeof via === 'string' ? urls(via, next) : [via.url]);
  };
  for (const [name, finding] of Object.entries(findings)) {
    const advisories = urls(name);
    const reviewed = today <= '2026-12-18' && finding.nodes.length > 0
      && finding.nodes.every((node) => packages[node]?.dev === true)
      && advisories.length > 0 && advisories.every((url) => url === known);
    result[reviewed ? 'reviewed' : 'blocked'].push(name);
  }
  return result;
}
