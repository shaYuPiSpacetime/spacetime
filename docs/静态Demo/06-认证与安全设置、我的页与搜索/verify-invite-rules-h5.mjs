import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const module06Dir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(module06Dir, '../../..');
const module07Dir = path.join(workspaceDir, 'docs/静态Demo/07-推广裂变与邀请奖励');

const read = (file) => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const admin06 = read(path.join(module06Dir, 'html/admin.html'));
const data06 = read(path.join(module06Dir, 'html/mock/demo-data.js'));
const js06 = read(path.join(module06Dir, 'html/assets/demo.js'));
const mobile07 = read(path.join(module07Dir, 'html/miniapp.html'));
const js07 = read(path.join(module07Dir, 'html/assets/demo.js'));

assert(admin06.includes('data-content-tab="business-rules"'), 'PRD-06 缺少“业务规则”H5 配置 Tab');
assert(data06.includes('key: "invite_rules"'), 'PRD-06 缺少 invite_rules 预置配置数据');
assert(data06.includes('title: "邀请规则"'), 'PRD-06 缺少邀请规则配置标题');
assert(js06.includes('filterComplianceByTab'), 'PRD-06 缺少 H5 内容 Tab 筛选逻辑');
assert(admin06.includes('邀请规则内容由 PRD-07 定义'), 'PRD-06 缺少内容归属提示');

assert(mobile07.includes('data-h5-content="invite-rules"'), 'PRD-07 邀请规则未改为 H5 内容容器');
assert(mobile07.includes('内容配置：PRD-06'), 'PRD-07 缺少 H5 配置来源标识');
assert(mobile07.includes('业务规则：PRD-07'), 'PRD-07 缺少业务规则来源标识');
assert(mobile07.includes('data-h5-cache-notice'), 'PRD-07 缺少最近成功缓存降级提示');
assert(js07.includes('setInviteRulesH5State'), 'PRD-07 缺少 H5 正常/缓存/不可用状态切换');
assert(!mobile07.includes('name="url"'), 'PRD-07 移动端不得承载 H5 URL 编辑控件');

console.log('PASS: 邀请规则 H5 的 06 配置归属与 07 消费边界已建立');
