import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/commercial/CommercialManagement.tsx', import.meta.url), 'utf8');
const vipModal = source.slice(source.indexOf('function VipPackageModal('), source.indexOf('function CoinPackageModal('));
const coinModal = source.slice(source.indexOf('function CoinPackageModal('), source.indexOf('function RefundApplyModal('));

for (const [productId, price] of Object.entries({
  coin_12: 428,
  coin_11: 268,
  coin_10: 99,
  vip_10: 1000,
  vip_7: 0.01,
  vip_8: 1,
})) {
  assert.ok(new RegExp(`\\b${productId}:\\s*${price}(?![\\d.])`).test(source), `${productId} 应保留提供的微信商品价格`);
}

assert.ok(/function getPublishedVirtualGood\(/.test(source), '编辑应按后端商品 ID 查找已登记微信商品');
assert.ok(/function canEnableVirtualGood\(/.test(source), '上架应校验已登记商品及有效支付价');
assert.ok(/!canEnableVirtualGood\(/.test(source), '上架按钮应执行价格约束');
for (const [modal, kind] of [[vipModal, 'vip'], [coinModal, 'coin']]) {
  assert.ok(modal.includes(`getPublishedVirtualGood('${kind}', form.id)`), `${kind} 编辑应展示对应商品`);
  assert.ok(modal.includes('微信商品 ID'), `${kind} 弹窗应展示微信商品 ID`);
  assert.ok(modal.includes('微信线上价（截图配置）'), `${kind} 弹窗应展示微信线上价来源`);
  assert.ok(modal.includes('readOnly={Boolean(published)}'), `${kind} 已登记商品有效支付价应为只读`);
  assert.ok(modal.includes("status: 'DISABLED'"), `${kind} 新套餐应默认下架`);
  assert.ok(modal.includes('先下架创建'), `${kind} 新套餐应提示先下架创建`);
  assert.ok(modal.includes('微信虚拟支付道具'), `${kind} 新套餐应提示先配置微信道具`);
}

console.log('商业化虚拟商品价格约束静态回归通过');
