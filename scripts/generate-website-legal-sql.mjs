import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'deploy/sql/prod/098_website_legal_publication.sql');
const source = [
  ['USER_AGREEMENT', '官网用户服务协议', 'docs/官网/官网用户服务协议.md', '运营主体'],
  ['PRIVACY_POLICY', '官网隐私政策', 'docs/官网/官网隐私政策.md', '个人信息处理者'],
];
const quote = value => `'${value.replaceAll("'", "''")}'`;

const statements = source.map(([type, title, file, entityLabel]) => {
  const markdown = readFileSync(path.join(root, file), 'utf8');
  const version = markdown.match(/^\*\*版本：\*\*(\d+\.\d+)$/m)?.[1];
  const entity = markdown.match(new RegExp(`^\\*\\*${entityLabel}：\\*\\*(.+)$`, 'm'))?.[1];
  const contact = markdown.match(/^\*\*联系渠道：\*\*(.+)$/m)?.[1];
  const body = markdown.split('## 一、')[1]?.split('## 核对依据')[0];
  assert.ok(version && entity && contact && body, `${file} 缺少正式协议字段`);
  assert.doesNotMatch(`${entity}\n${contact}\n${body}`, /【|待核定|TODO/);
  const content = `${entityLabel}：${entity}\n联系渠道：${contact}\n\n一、${body}`
    .replace(/^## /gm, '')
    .replaceAll('**', '')
    .trim();
  return `INSERT INTO website_legal_document(document_type,version,title,content,status)\n`
    + `SELECT ${quote(type)},${quote(version)},${quote(title)},${quote(content)},'PUBLISHED'\n`
    + `WHERE NOT EXISTS(SELECT 1 FROM website_legal_document WHERE document_type=${quote(type)} AND version=${quote(version)});`;
});

const sql = `-- 官网用户协议与隐私政策正式正文；来源：docs/官网/，重复执行不覆盖已有版本。\n`
  + `${statements.join('\n\n')}\n`;
if (process.argv.includes('--check')) {
  assert.equal(readFileSync(output, 'utf8'), sql, '官网正式协议 SQL 与 Markdown 正文不一致');
  console.log('官网正式协议正文与发布迁移一致');
} else {
  writeFileSync(output, sql);
  console.log('已生成官网正式协议发布迁移');
}
