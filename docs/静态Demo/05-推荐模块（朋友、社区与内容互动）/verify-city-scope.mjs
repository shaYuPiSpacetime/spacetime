import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(demoRoot, '../../..');
const prdRoot = path.join(repoRoot, 'docs/需求文档/需求文档-正式版/定稿：05-推荐模块（朋友、社区与内容互动）');

const targets = [
  path.join(prdRoot, 'PRD-05_模块公共定义.md'),
  path.join(prdRoot, 'PRD-05_甲方前置准备清单.md'),
  path.join(prdRoot, '移动端/APP-05_端内定义.md'),
  path.join(prdRoot, '移动端/模块PRD文档/模块PRD_APP-05_推荐模块（朋友、社区与内容互动）.md'),
  path.join(prdRoot, '移动端/页面规格/APP-02_成家同城信息流页.md'),
  path.join(prdRoot, '移动端/页面规格/APP-05_发布动态页.md'),
  path.join(prdRoot, '蓝湖UI缺少页面清单.md'),
  path.join(demoRoot, 'html/miniapp.html'),
];

const forbidden = [
  'APP-05-city-02',
  'ACT-change-city',
  '手动切换城市',
  '手动选择城市',
  '城市选择器',
  '热门城市',
  '城市搜索',
  '切换城市入口',
];

const required = ['资料城市只读', '现居城市', '固定必填', '去热门'];
const failures = [];
for (const file of targets) {
  const text = fs.readFileSync(file, 'utf8');
  for (const token of forbidden) {
    if (text.includes(token)) failures.push(`${path.relative(repoRoot, file)} 仍包含「${token}」`);
  }
}

const combined = targets.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const token of required) {
  if (!combined.includes(token)) failures.push(`缺少最终口径「${token}」`);
}

const missingList = fs.readFileSync(path.join(prdRoot, '蓝湖UI缺少页面清单.md'), 'utf8');
if (missingList.includes('APP-05-city-03')) failures.push('蓝湖缺失页面清单仍包含已删除的 APP-05-city-03');

if (failures.length) {
  console.error('PRD-05 同城范围校验失败：');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PRD-05 同城范围校验通过：本期仅使用资料城市，不提供城市切换。');
