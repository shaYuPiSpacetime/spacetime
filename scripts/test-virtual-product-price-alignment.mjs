import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const catalog = read('backend/src/main/java/com/spacetime/common/service/WechatVirtualProductCatalog.java');
const admin = read('frontend/src/pages/commercial/CommercialManagement.tsx');
const sql = read('deploy/sql/prod/092_virtual_product_price_alignment.sql');

const expected = {
  coin_10: '99.00',
  coin_11: '268.00',
  coin_12: '428.00',
  vip_7: '0.01',
  vip_8: '1.00',
  vip_10: '1000.00',
};

for (const [productId, price] of Object.entries(expected)) {
  const [, kind, id] = productId.match(/^(coin|vip)_(\d+)$/);
  assert.match(catalog, new RegExp(`"${productId}", new BigDecimal\\("${price}"\\)`), `${productId} 后端价格`);
  assert.match(admin, new RegExp(`\\b${productId}: ${Number(price)}(?=,|\\n)`), `${productId} 后台价格`);
  const column = kind === 'coin' ? 'amount' : 'price';
  const start = sql.indexOf(`UPDATE app_${kind}_package\nSET ${column} = CASE id`);
  const end = sql.indexOf('END,', start);
  assert.ok(start >= 0 && end > start, `${productId} 缺少数据库有效价迁移`);
  assert.match(sql.slice(start, end), new RegExp(`WHEN ${id} THEN ${price}`), `${productId} 数据库价格`);
}

for (const [id, count] of [[10, 1000], [11, 3000], [12, 6000]]) {
  assert.match(sql, new RegExp(`coin_count = CASE id[\\s\\S]*?WHEN ${id} THEN ${count}`), `coin_${id} 到账数量`);
}

assert.match(sql, /virtual_product_price_preflight/, '生产迁移必须保留商品身份预检');
console.log('微信虚拟商品后端、管理后台和生产迁移价格契约一致');
