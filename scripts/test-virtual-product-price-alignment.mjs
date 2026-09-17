import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const catalog = read('backend/src/main/java/com/spacetime/common/service/WechatVirtualProductCatalog.java');
const changeService = read('backend/src/main/java/com/spacetime/common/service/VirtualPriceChangeService.java');
const payment = read('backend/src/main/java/com/spacetime/miniapp/service/impl/PaymentServiceImpl.java');
const admin = read('frontend/src/pages/commercial/CommercialManagement.tsx');
const migration = read('deploy/sql/prod/093_virtual_product_flexible_price.sql');
const backendWorkflow = read('.github/workflows/deploy-backend-prod.yml');

assert.doesNotMatch(catalog, /ONLINE_PRICES|expectedPrice\(/, '支付目录不得写死六档售价');
assert.match(changeService, /requestChange\(/, '改价必须进入待发布任务');
assert.match(changeService, /WAIT_EFFECTIVE/, '微信发布任务成功不得立刻切换支付价');
assert.match(changeService, /setWechatProductId\(change\.getNewProductId\(\)\)/,
  '生效价和新商品 ID 必须同步切换');
assert.match(payment, /order\.setWechatProductId\(productId\)/, '订单必须保存商品 ID 快照');
assert.match(migration, /CREATE TABLE IF NOT EXISTS app_virtual_price_change/, '必须保留任务表');
assert.match(migration, /ADD COLUMN wechat_product_id/, '必须保留当前商品 ID');
assert.doesNotMatch(backendWorkflow, /deploy\/sql\/prod\/092_virtual_product_price_alignment\.sql/,
  '生产部署不得回放旧固定价格');
assert.doesNotMatch(admin, /ONLINE_VIRTUAL_GOODS|readOnly=\{Boolean\(published\)\}/,
  '管理后台售价不得被旧商品快照锁死');

console.log('微信虚拟商品灵活改价契约静态回归通过');
