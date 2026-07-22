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
  ['草稿保存动作', 'data-save-draft'],
  ['放弃草稿并返回动作', 'data-abandon-draft'],
  ['图片上传状态', 'uploadStatus'],
  ['申请认识别名', '申请认识'],
  ['不看 TA 动态动作', 'hide_author_posts'],
  ['取消不看 TA 动态动作', 'unhide_author_posts'],
  ['评论预览', 'commentPreview'],
  ['话题参与者头像', 'participantAvatars'],
  ['详情互动人数', '互动 ${escapeHtml(post.interactionCount'],
  ['评论最新最早排序', 'data-comment-sort'],
  ['举报对象幂等键', 'reportSubmissions'],
  ['发布后进入我的动态', "location.hash = 'APP-05-PAGE-user-posts'"],
  ['发布失败反馈层', 'data-render="publish-feedback"'],
  ['发布失败演示动作', 'data-demo-publish-failure'],
  ['发布失败具体原因', 'showPublishFailure'],
  ['点赞空态', '暂无点赞'],
  ['评论空态', '暂无评论'],
  ['他人主页资料', 'otherUserProfile'],
  ['互动关系路由', 'interactionEstablished'],
  ['直达 PRD-03', 'data-direct-chat'],
  ['热门与话题通用空态', '暂无数据'],
  ['内容分享动作', '已调起小程序分享'],
  ['悦目用户照片卡', 'yuemuUsers'],
  ['悦目缘分标签', 'yuemu-fate'],
  ['更多操作灰色反馈', 'showMoreActionFeedback'],
  ['取消关注确认弹窗', 'unfollowConfirmModal'],
  ['取消关注确认动作', 'data-confirm-unfollow'],
  ['内容不可见灰色反馈', 'data-demo-detail-unavailable'],
  ['内容不可见反馈文案', '内容已下架'],
  ['YO 悄悄话弹窗', 'YO悄悄话-弹窗'],
  ['悄悄话字数限制', 'maxlength="60"'],
  ['悄悄话字数统计', 'data-greeting-count'],
];

const missing = assertions.filter(([, token]) => !source.includes(token));
if (missing.length) {
  console.error('PRD-05 反向缺口静态验收失败：');
  for (const [name, token] of missing) console.error(`- ${name}：缺少 ${token}`);
  process.exit(1);
}

const forbidden = [
  ['@Ta 入口', '选择 @ 用户'],
  ['社区私信中转页', 'APP-05-PAGE-community-private-entry'],
  ['社区私信中转数据', 'privateEntryStates'],
  ['单条内容屏蔽', 'hide_post'],
  ['诚意贴标题输入', 'data-publish-title'],
  ['诚意贴正文下限', 'sincereMinText'],
  ['诚意贴排序控件', 'data-sincere-sort'],
  ['旧招呼语模板数据', 'greetingTemplates'],
  ['旧招呼语模板控件', 'data-greeting-template'],
];

const unexpected = forbidden.filter(([, token]) => source.includes(token));
if (unexpected.length) {
  console.error('PRD-05 已取消能力仍残留：');
  for (const [name, token] of unexpected) console.error(`- ${name}：仍包含 ${token}`);
  process.exit(1);
}

console.log(`PRD-05 反向缺口静态验收通过：${assertions.length} 项。`);
