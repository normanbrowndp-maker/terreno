import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.').replaceAll('\\', '/');
const files = execFileSync('git', ['-c', `safe.directory=${root}`, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const patterns = [/AKIA[0-9A-Z]{16}/, /gh[pousr]_[A-Za-z0-9]{30,}/, /sk-proj-[A-Za-z0-9_-]{30,}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const findings: string[] = [];
for (const file of new Set(files)) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && !['.env.example', '.env.test.example'].includes(file)) findings.push(`${file}: environment file must not be tracked`);
  if (/\.(?:png|jpe?g|woff2?|ico|pdf|zip)$/i.test(file)) continue;
  const content = await readFile(file, 'utf8');
  content.split(/\r?\n/).forEach((line, index) => {
    if (patterns.some((pattern) => pattern.test(line))) findings.push(`${file}:${index + 1}: potential credential (value redacted)`);
  });
}
if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
else console.log(`Credential pattern scan: PASS (${new Set(files).size} tracked/nonignored files; no secret values printed)`);
