import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const read = (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  assert.ok(existsSync(absolutePath), `${relativePath} 不存在`);
  return readFileSync(absolutePath, 'utf8');
};

const html = read('docs/官网/index.html');
const css = read('docs/官网/styles.css');
const script = read('docs/官网/app.js');

assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, '官网必须且只能有一个 h1');

for (const landmark of ['header', 'nav', 'main', 'footer']) {
  assert.match(html, new RegExp(`<${landmark}(?:\\s|>)`), `官网缺少 ${landmark} 语义区域`);
}

for (const expected of [
  'href="#main-content"',
  'id="main-content"',
  '时空邂逅',
  '真实认证',
  '智能推荐',
  '社区互动',
  '安全沟通',
  '上海兴家立业网络科技',
  '备案信息将在审核通过后展示',
  'aria-expanded="false"',
  'aria-controls="primary-navigation"',
]) {
  assert.ok(html.includes(expected), `官网缺少关键内容：${expected}`);
}

assert.doesNotMatch(html, /[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼]ICP备\d+/u, '不得编造 ICP 备案号');
assert.doesNotMatch(html, /<img\b[^>]*?(?<!alt=(?:"[^"]*"|'[^']*'))>/iu, '图片必须提供 alt 文本');

for (const expected of [
  '--color-primary:',
  '--color-surface:',
  '--color-text:',
  ':focus-visible',
  'prefers-reduced-motion',
  'clamp(',
  '@media (min-width: 48rem)',
  'min-height: 44px',
]) {
  assert.ok(css.includes(expected), `官网样式缺少关键约束：${expected}`);
}

for (const expected of [
  "document.querySelector('[data-current-year]')",
  "document.querySelector('[data-menu-toggle]')",
  "event.key === 'Escape'",
  "setAttribute('aria-expanded'",
]) {
  assert.ok(script.includes(expected), `官网脚本缺少关键行为：${expected}`);
}

console.log('官网静态契约校验通过');
