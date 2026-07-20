import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const html = read('html/miniapp.html');
const script = read('html/assets/demo.js');
const mock = read('html/mock/demo-data.js');
const source = `${html}\n${script}\n${mock}`;

const assertions = [
  ['互动中心页面', 'APP-05-PAGE-interaction-center'],
  ['关注粉丝列表页面', 'APP-05-PAGE-follow-relations'],
  ['动态互动用户列表页面', 'APP-05-PAGE-post-interactors'],
  ['动态收藏动作', 'data-toggle-favorite'],
  ['草稿保存动作', 'data-save-draft'],
  ['草稿恢复动作', 'data-restore-draft'],
  ['图片上传状态', 'uploadStatus'],
  ['申请认识别名', '申请认识'],
  ['屏蔽当前内容动作', 'hide_post'],
  ['不看 TA 动态动作', 'hide_author_posts'],
  ['取消不看 TA 动态动作', 'unhide_author_posts'],
  ['评论预览', 'commentPreview'],
  ['话题最新动态预览', 'latestPost'],
  ['话题参与者头像', 'participantAvatars'],
];

const missing = assertions.filter(([, token]) => !source.includes(token));
if (missing.length) {
  console.error('PRD-05 反向缺口静态验收失败：');
  for (const [name, token] of missing) console.error(`- ${name}：缺少 ${token}`);
  process.exit(1);
}

console.log(`PRD-05 反向缺口静态验收通过：${assertions.length} 项。`);
