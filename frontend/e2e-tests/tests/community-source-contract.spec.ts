import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE_ROOT = resolve(process.cwd(), 'src');
const COMMUNITY_ROOTS = [
  resolve(SOURCE_ROOT, 'pages/community'),
  resolve(SOURCE_ROOT, 'features/community'),
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

test.describe('PRD-05 社区生产代码动态文案静态契约', () => {
  test('metaCopy 只允许读取 key，不允许生产代码 fallback', () => {
    const violations = COMMUNITY_ROOTS.flatMap(sourceFiles).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return source.split('\n').flatMap((line, index) => (
        /metaCopy\(\s*meta\s*,\s*['"][^'"]+['"]\s*,/.test(line)
          ? [`${file}:${index + 1}: ${line.trim()}`]
          : []
      ));
    });
    expect(violations, violations.join('\n')).toEqual([]);
  });

  test('动态确认按钮不允许中文逻辑回退', () => {
    const violations = COMMUNITY_ROOTS.flatMap(sourceFiles).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return source.split('\n').flatMap((line, index) => (
        /confirmText=\{[^\n]*\|\|\s*['"][^'"]*[\u4e00-\u9fff]/.test(line)
          ? [`${file}:${index + 1}: ${line.trim()}`]
          : []
      ));
    });
    expect(violations, violations.join('\n')).toEqual([]);
  });
});
