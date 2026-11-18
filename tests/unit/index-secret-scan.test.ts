import { expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { scanRepository } from '../../scripts/lib/secret-scan';

it('finds a staged credential even after the working copy has been cleaned', async () => {
  const directory = await mkdtemp(join(resolve(tmpdir()), 'travel-secret-test-'));
  try {
    const git = (args: string[]) => execFileSync('git', ['-c', `safe.directory=${directory.replaceAll('\\', '/')}`, ...args], { cwd: directory, stdio: 'pipe' });
    git(['init', '--quiet']);
    await writeFile(join(directory, 'probe.txt'), 'ghp_' + 'A'.repeat(36));
    git(['add', 'probe.txt']);
    await writeFile(join(directory, 'probe.txt'), 'clean working copy');
    const findings = await scanRepository(directory);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('index:probe.txt');
    expect(findings.join()).not.toContain('A'.repeat(36));
  } finally {
    if (!resolve(directory).startsWith(resolve(tmpdir()) + sep + 'travel-secret-test-')) throw new Error('Unsafe fixture cleanup');
    await rm(directory, { recursive: true, force: true });
  }
});
