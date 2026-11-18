import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { architectureViolations } from './lib/architecture';

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? sourceFiles(join(directory, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(directory, entry.name)] : []))).flat();
}
const inputs = await Promise.all((await sourceFiles('src')).map(async (file) => ({ file: file.replaceAll('\\', '/'), content: await readFile(file, 'utf8') })));
const violations = architectureViolations(inputs);
if (violations.length) { console.error(violations.join('\n')); process.exitCode = 1; }
else console.log(`Architecture boundaries: PASS (${inputs.length} source files)`);
