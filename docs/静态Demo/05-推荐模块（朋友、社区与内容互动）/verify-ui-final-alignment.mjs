import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(demoRoot, '../../..');
const prdRoot = path.join(repoRoot, 'docs/需求文档/需求文档-正式版/定稿：05-推荐模块（朋友、社区与内容互动）');

const targetFiles = [
  path.join(prdRoot, 'PRD-05_模块公共定义.md'),
  path.join(prdRoot, '移动端/APP-05_端内定义.md'),
  path.join(prdRoot, '移动端/模块PRD文档/模块PRD_APP-05_推荐模块（朋友、社区与内容互动）.md'),
  ...['APP-03_成家热门信息流页.md', 'APP-04_话题列表页.md', 'APP-05_发布动态页.md', 'APP-06_动态详情页.md', 'APP-07_话题详情页.md', 'APP-08_举报弹窗.md', 'APP-09_悦目页.md', 'APP-10_诚意贴列表页.md', 'APP-12_个人动态区.md', 'APP-13_社区打招呼页.md', 'APP-15_社区更多操作弹窗.md', 'APP-17_关注粉丝列表页.md', 'APP-18_动态互动用户列表页.md']
    .map((file) => path.join(prdRoot, '移动端/页面规格', file)),
  path.join(prdRoot, '蓝湖UI缺少页面清单.md'),
  path.join(demoRoot, '00-文档读取与页面范围.md'),
  path.join(demoRoot, '01-页面元素清单.md'),
  path.join(demoRoot, '02-静态HTML实现方案.md'),
  path.join(demoRoot, '03-静态HTML自测与还原度报告.md'),
  path.join(demoRoot, '04-静态HTML交付报告.md'),
  path.join(demoRoot, 'html/miniapp.html'),
  path.join(demoRoot, 'html/assets/demo.js'),
  path.join(demoRoot, 'html/mock/demo-data.js'),
];

const forbidden = [
  'M05-RULE-content-favorite',
  'community_favorite',
  'favoriteCount',
  'favoritedByMe',
  'favoritePostIds',
  'data-toggle-favorite',
  'APP-05-post-interactors-02',
  'APP-05-hot-02',
  'APP-05-post-detail-04',
  'APP-05-yuemu-02',
  'APP-05-publish-04',
  'APP-05-report-03',
  'APP-05-topic-list-02',
  'APP-05-greeting-02',
  'APP-05-greeting-03',
  'APP-05-PAGE-topic-list-ACT-search',
  'APP-05-PAGE-topic-list-FILTER-keyword',
  'latestPost',
  '最新/热门',
  'M05-CFG-mention-limit',
  'M05-NTF-mention',
  'M05-RULE-community-private-entry',
  'M05-RULE-hide-post',
  'APP-05-publish-03',
  'APP-05-topic-detail-02',
  'APP-05-topic-detail-03',
  'APP-05-greeting-04',
  'APP-05-greeting-05',
  'privateEntryStates',
  'data-private-state',
  'data-hide-post',
  'hide_post',
];

const required = [
  '申请认识',
  '互动人数',
  '最新/最早',
  '暂无点赞',
  '暂无评论',
  'M05-RULE-report-idempotency',
  'reporterId + targetType + targetId',
  '我的动态',
  '模块 08',
  'M05-RULE-community-contact-routing',
  'otherUserProfile',
  'data-direct-chat',
  '分享、关注/取消关注、不看 TA 动态/取消不看、举报',
  '缺省页-切图',
  '千寻-知音-悦目',
  '千寻-知音-诚意贴',
  '发布动态-诚意贴',
  '发布失败',
  '具体失败原因',
  'data-render="publish-feedback"',
  'data-demo-publish-failure',
  '| PRD 画板总数 | 45 |',
  '| 完整覆盖 | 45 |',
  '| 部分覆盖 | 0 |',
  '| 明确缺失 | 0 |',
  '缘分标签',
  '学历学校',
  'data-abandon-draft',
  'showMoreActionFeedback',
  '千寻-成家-取消关注',
  'data-confirm-unfollow',
  'data-demo-detail-unavailable',
  '内容已下架',
  'YO悄悄话-弹窗',
  '1-60 字',
];

const failures = [];
for (const file of targetFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const token of forbidden) {
    if (content.includes(token)) {
      failures.push(`${path.relative(repoRoot, file)} 仍包含已废弃口径「${token}」`);
    }
  }
}

const combined = targetFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const token of required) {
  if (!combined.includes(token)) failures.push(`缺少最终口径「${token}」`);
}

const missingList = fs.readFileSync(path.join(prdRoot, '蓝湖UI缺少页面清单.md'), 'utf8');
for (const token of ['变更摘要', '核查方法', '补稿优先级', '闭环', '已解决事项', '历史版本', '整改记录']) {
  if (missingList.includes(token)) failures.push(`蓝湖缺失页面清单仍包含过程性内容「${token}」`);
}
if (missingList.includes('APP-05-city-03')) failures.push('蓝湖缺失页面清单仍包含已删除的 APP-05-city-03');

for (const removedFile of ['APP-14_社区发私信页.md', 'APP-16_婚恋用户主页.md']) {
  const removedPath = path.join(prdRoot, '移动端/页面规格', removedFile);
  if (fs.existsSync(removedPath)) failures.push(`已取消页面规格仍存在：${removedFile}`);
}

if (failures.length) {
  console.error('PRD-05 UI 最终口径校验失败：');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PRD-05 UI 最终口径校验通过：${targetFiles.length} 个文件。`);
