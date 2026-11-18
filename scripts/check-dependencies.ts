import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { assessDependencyAudit } from './lib/dependency-review';

const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this check through npm run check:dependencies');
const response = spawnSync(process.execPath, [npm, 'audit', '--json'], { encoding: 'utf8', timeout: 60000, windowsHide: true });
await mkdir('.local', { recursive: true });
await writeFile('.local/dependency-audit.json', response.stdout || '{}');
const audit = JSON.parse(response.stdout || '{}');
if (response.error || response.status === null || ![0, 1].includes(response.status) || audit.error || !audit.metadata || !audit.vulnerabilities) {
  throw new Error('Dependency audit could not complete; see ignored .local/dependency-audit.json');
}
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const assessment = assessDependencyAudit(audit.vulnerabilities, lock.packages, new Date().toISOString().slice(0, 10));
console.log(`Dependency gate: ${assessment.blocked.length} blocked, ${assessment.reviewed.length} reviewed dev-only findings; full npm audit exit=${response.status}.`);
if (assessment.reviewed.length) console.log('Known unpatched picomatch advisory remains open; exception expires 2026-12-18. See docs/DEPENDENCY_REVIEW.md.');
if (assessment.blocked.length) { console.error(`Unreviewed, production or expired findings: ${assessment.blocked.join(', ')}`); process.exitCode = 1; }
