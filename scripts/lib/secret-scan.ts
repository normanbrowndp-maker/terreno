import { execFileSync } from 'node:child_process';
import { readFile, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const patterns = [/AKIA[0-9A-Z]{16}/, /gh[pousr]_[A-Za-z0-9]{30,}/, /sk-proj-[A-Za-z0-9_-]{30,}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const binary = /\.(?:png|jpe?g|woff2?|ico|pdf|zip|exe|dll|wasm)$/i;

export async function scanRepository(directory: string): Promise<string[]> {
  const root = resolve(directory);
  const git = (args: string[], input?: string) => execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, ...args], { cwd: root, ...(input === undefined ? {} : { input }), maxBuffer: 64 * 1024 * 1024 });
  const findings: string[] = [];
  const inspect = (file: string, content: string, source: string) => {
    if (/(^|\/)\.env(?:\.|$)/.test(file) && !['.env.example', '.env.test.example'].includes(file)) findings.push(`${source}:${file}: environment file must not be tracked`);
    if (/^(?:\.local|node_modules|backups|user-data|uploads)\//.test(file)) findings.push(`${source}:${file}: private/generated data must not be tracked`);
    content.split(/\r?\n/).forEach((line, index) => {
      if (patterns.some((pattern) => pattern.test(line))) findings.push(`${source}:${file}:${index + 1}: potential credential (redacted)`);
    });
  };
  const staged = git(['ls-files', '--stage', '-z']).toString('utf8').split('\0').filter(Boolean).map((line) => {
    const match = /^\d+ ([a-f0-9]+) (\d)\t([\s\S]+)$/.exec(line);
    if (!match || match[2] !== '0') throw new Error('Unmerged or invalid index; credential scan refused');
    return { sha: match[1]!, file: match[3]! };
  }).filter(({ file }) => !binary.test(file));
  if (staged.length) {
    const batch = git(['cat-file', '--batch'], staged.map(({ sha }) => sha).join('\n') + '\n');
    let position = 0;
    for (const entry of staged) {
      const newline = batch.indexOf(10, position);
      const header = batch.subarray(position, newline).toString('ascii').split(' ');
      const size = Number(header[2]);
      if (newline < 0 || header[1] !== 'blob' || !Number.isSafeInteger(size)) throw new Error('Cannot inspect index blob');
      const start = newline + 1;
      inspect(entry.file, batch.subarray(start, start + size).toString('utf8'), 'index');
      position = start + size + 1;
    }
  }
  const working = new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).toString('utf8').split('\0').filter(Boolean));
  for (const file of working) {
    if (binary.test(file)) continue;
    try {
      const path = join(root, file);
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) { findings.push(`worktree:${file}: symlink source requires explicit review`); continue; }
      if (stat.isFile()) inspect(file, await readFile(path, 'utf8'), 'worktree');
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
  return findings;
}
