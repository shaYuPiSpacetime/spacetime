import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const api = read('src/api/community.ts');
const page = read('src/pages/community/CommunityReportsPage.tsx');

assert.match(api, /evidenceImageUrls\?:\s*string\[\]/, '举报详情类型必须接收举报人上传的附件');
assert.match(page, /DetailSection title="举报描述"/, '详情必须独立展示举报人填写的描述');
assert.match(page, /current\.extraText/, '举报描述必须读取真实 extraText');
assert.match(page, /DetailSection title="举报附件"/, '详情必须独立展示举报附件');
assert.match(page, /current\.evidenceImageUrls/, '举报附件必须读取后端 evidenceImageUrls');
assert.match(page, /evidenceType === 'target'/, '聊天举报必须识别被举报的目标消息');
assert.match(page, /DetailSection title="被举报消息"/, '聊天举报必须直接展示被举报消息');
assert.match(page, /viewCommunityReportEvidenceContent\(/, '目标消息正文必须通过既有审计接口读取');
assert.doesNotMatch(
  page,
  /current\.context\?\.content \|\| current\.context\?\.summary \|\| current\.extraText/,
  '不得再把冻结快照 JSON 当作举报描述展示',
);

console.log('Community report detail closure passed.');
