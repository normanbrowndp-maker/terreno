import { scanRepository } from './lib/secret-scan';
const findings = await scanRepository('.');
if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
else console.log('Credential pattern scan: PASS (index blobs and working/untracked source; values redacted)');
