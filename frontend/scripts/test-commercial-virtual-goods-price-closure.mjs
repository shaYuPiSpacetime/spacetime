import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

console.log('商业化虚拟商品灵活调价静态回归通过');
