import ts from 'typescript';
import { posix } from 'node:path';

export function architectureViolations(files: readonly { file: string; content: string }[]): string[] {
  const violations: string[] = [];
  for (const { file, content } of files) {
    const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const ownerModule = /^src\/modules\/([^/]+)/.exec(file)?.[1];
    const isClient = source.statements.some((node) => ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) && node.expression.text === 'use client');
    const inspect = (specifier: string) => {
      const target = specifier.startsWith('@/') ? `src/${specifier.slice(2)}` : specifier.startsWith('.') ? posix.normalize(posix.join(posix.dirname(file), specifier)) : specifier;
      const other = /^src\/modules\/([^/]+)(?:\/(.*))?$/.exec(target);
      let reason: string | undefined;
      if (ownerModule && other && ownerModule !== other[1] && other[2] && !/^index(?:\.ts)?$/.test(other[2])) reason = 'private cross-module import';
      if (file.startsWith('src/shared/') && other) reason = 'shared code depends on domain';
      if (ownerModule && target.startsWith('src/app/')) reason = 'domain depends on HTTP/UI';
      if (isClient && (target.startsWith('src/shared/db') || target === 'pg' || target === 'node-pg-migrate')) reason = 'client imports server database code';
      if (target === 'pg' && !file.startsWith('src/shared/db/')) reason = 'database driver outside infrastructure boundary';
      if (reason) violations.push(`${file}: ${reason}: ${specifier}`);
    };
    const visit = (node: ts.Node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) inspect(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) inspect(node.arguments[0].text);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return violations;
}
