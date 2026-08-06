import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const apiSource = readFileSync(new URL('../src/api/commercial.ts', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/commercial/CommercialManagement.tsx', import.meta.url), 'utf8');
const helperSource = readFileSync(new URL('../src/pages/commercial/commercialConfigLog.ts', import.meta.url), 'utf8');

assert.match(apiSource, /changeModuleName\?: string/, '日志接口类型必须接收中文模块名');
assert.match(apiSource, /changeReason\?: string/, '日志接口类型必须接收变更原因');
assert.match(apiSource, /beforeSnapshot\?: string/, '日志接口类型必须接收变更前快照');
assert.match(apiSource, /afterSnapshot\?: string/, '日志接口类型必须接收变更后快照');
assert.doesNotMatch(pageSource, /before:\s*'-'/, '变更前不能再固定显示短横线');
assert.match(pageSource, /label="变更原因"/, '日志抽屉必须单独展示变更原因');
assert.match(pageSource, /buildCommercialLogChanges/, '日志抽屉必须根据前后快照生成中文差异');
assert.match(apiSource, /idealBatchDiscountPercent: number/, '商业化配置接口必须包含理想型解锁全部折扣比例');
assert.match(helperSource, /理想型解锁全部折扣比例/, '变更日志必须用中文展示折扣配置项');
assert.match(pageSource, /请填写变更原因/, '保存商业化配置前必须填写变更原因');

const helperJavascript = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helperModule = await import(`data:text/javascript;base64,${Buffer.from(helperJavascript).toString('base64')}`);
const changes = helperModule.buildCommercialLogChanges({
  changeModule: 'commercial',
  beforeSnapshot: JSON.stringify({ settings: { normalViewQuota: 3 } }),
  afterSnapshot: JSON.stringify({ settings: { normalViewQuota: 5 } }),
});
assert.deepEqual(changes, [{ item: '普通用户每日查看配额', before: '3', after: '5' }], '必须从快照生成中文字段和值');

const discountChanges = helperModule.buildCommercialLogChanges({
  changeModule: 'commercial',
  beforeSnapshot: JSON.stringify({ settings: { idealBatchDiscountPercent: 10 } }),
  afterSnapshot: JSON.stringify({ settings: { idealBatchDiscountPercent: 15 } }),
});
assert.deepEqual(discountChanges, [{ item: '理想型解锁全部折扣比例', before: '10', after: '15' }], '折扣配置必须显示中文前后值');

const legacyChanges = helperModule.buildCommercialLogChanges({ changeModule: 'commercial' });
assert.deepEqual(legacyChanges, [{
  item: '商业化配置',
  before: '历史记录未保存快照',
  after: '历史记录未保存快照',
}], '历史记录没有快照时必须明确说明');

console.log('商业化配置变更日志静态回归测试通过');
