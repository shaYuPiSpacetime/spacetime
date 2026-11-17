import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/commercial/CommercialManagement.tsx', import.meta.url), 'utf8');
const vipModal = source.slice(source.indexOf('function VipPackageModal('), source.indexOf('function CoinPackageModal('));
const coinModal = source.slice(source.indexOf('function CoinPackageModal('), source.indexOf('function RefundApplyModal('));

assert.doesNotMatch(source, /PUBLISHED_VIRTUAL_GOODS|getPublishedVirtualGood|canEnableVirtualGood/, '前端不应再用固定截图价格限制调价');
assert.match(source, /function PendingPrice\(/, '列表必须展示待生效价格和进度');
assert.match(source, /priceChangeView\(item\)\.pendingPrice \?\? item\.price/, '全量保存会员配置时应保留待生效报价');
assert.match(source, /priceChangeView\(item\)\.pendingPrice \?\? item\.discountAmount \?\? item\.amount/, '全量保存币包配置时应保留待生效报价');
assert.match(source, /priceChangeStatusText\(status\)/, '微信商品状态应以中文展示');
assert.match(source, /新价生效前，小程序仍按当前可支付价销售/, '运营端必须说明切价前旧价继续销售');

for (const [modal, kind] of [[vipModal, '会员'], [coinModal, '千寻币']]) {
  const priceField = modal.match(/<label className="field">优惠价（申请新价）[\s\S]*?<\/label>/)?.[0];
  assert.ok(priceField, `${kind} 套餐应提供申请新价输入框`);
  assert.doesNotMatch(priceField, /readOnly/, `${kind} 套餐新价不能只读`);
  assert.match(priceField, /type="number"/, `${kind} 套餐新价必须是数字输入`);
  assert.match(modal, /当前可支付价/, `${kind} 套餐应展示用户当前可支付价`);
  assert.match(modal, /pendingPrice/, `${kind} 套餐应回显待生效报价`);
  assert.match(modal, /status: 'DISABLED'/, `${kind} 新套餐应默认下架`);
}

const rowHelperSource = source.slice(source.indexOf('function toCoinPackageRow('), source.indexOf('function toScenePriceRow('));
const helperJavascript = ts.transpileModule(`
function priceChangeView(item: unknown) { return item; }
${rowHelperSource}
export { toCoinPackageRow };
`, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { toCoinPackageRow } = await import(`data:text/javascript;base64,${Buffer.from(helperJavascript).toString('base64')}`);
const first = { id: 14, packageName: '币包甲', coinCount: 500, amount: 30 };
const second = { id: 16, packageName: '币包乙', coinCount: 500, amount: 50 };
assert.notEqual(toCoinPackageRow(first, 0).id, toCoinPackageRow(second, 1).id, '币数相同的两个套餐不能复用同一列表行');
assert.equal(toCoinPackageRow(first, 0).id, toCoinPackageRow({ ...first, coinCount: 350 }, 0).id, '编辑币数不能改变套餐行的身份');
assert.notEqual(toCoinPackageRow({ ...first, id: undefined }, 13).id, toCoinPackageRow(first, 0).id, '新增草稿不能和已保存套餐编号冲突');

console.log('商业化虚拟商品灵活调价静态回归通过');
