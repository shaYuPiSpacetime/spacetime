import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks = [];

function file(path) {
  const abs = join(root, path);
  if (!existsSync(abs)) {
    throw new Error(`缺少文件: ${path}`);
  }
  return readFileSync(abs, 'utf8');
}

function includes(path, snippets) {
  const text = file(path);
  snippets.forEach((snippet) => {
    checks.push(`${path} 包含 ${snippet}`);
    if (!text.includes(snippet)) {
      throw new Error(`${path} 未包含: ${snippet}`);
    }
  });
}

[
  'backend/src/main/java/com/spacetime/admin/controller/CommercialConfigController.java',
  'backend/src/main/java/com/spacetime/admin/service/CommercialAdminService.java',
  'backend/src/main/java/com/spacetime/admin/service/impl/CommercialAdminServiceImpl.java',
  'backend/src/main/java/com/spacetime/common/entity/CoinSceneConfig.java',
  'backend/src/main/java/com/spacetime/common/entity/CommercialConfigLog.java',
  'backend/src/main/java/com/spacetime/common/entity/RefundRecord.java',
  'backend/src/main/java/com/spacetime/common/entity/PaymentNotifyLog.java',
  'frontend/src/api/commercial.ts',
  'frontend/src/pages/commercial/CommercialManagement.tsx',
].forEach((path) => {
  checks.push(`存在文件 ${path}`);
  file(path);
});

includes('backend/docs/sql/schema-commercial.sql', [
  'mobile_icon',
  'benefit_value',
  'fixed_flag',
  'subscription_type',
  'wechat_product_id',
  'app_coin_scene_config',
  'app_commercial_config_log',
  'app_refund_record',
  'app_payment_notify_log',
  'balance_before',
]);

includes('backend/src/main/java/com/spacetime/admin/controller/CommercialConfigController.java', [
  '@GetMapping("/config")',
  '@PutMapping("/config")',
  '@GetMapping("/config/logs")',
  '@GetMapping("/users/{userId}/asset-detail")',
  '@RequirePermission',
]);

includes('backend/src/main/java/com/spacetime/admin/controller/FinanceOrderController.java', [
  '@PostMapping("/{id}/refund")',
  '@PostMapping("/export")',
]);

includes('backend/src/main/java/com/spacetime/admin/controller/FinanceRefundController.java', [
  '@GetMapping("/list/{id}")',
  '@PostMapping("/export")',
]);

includes('backend/src/main/java/com/spacetime/admin/controller/FinanceFlowController.java', [
  '@PostMapping("/export")',
]);

includes('backend/src/main/java/com/spacetime/admin/controller/FinanceStatsController.java', [
  '@GetMapping("/reconcile/daily")',
  '@PostMapping("/reconcile/export")',
]);

includes('frontend/src/router/index.tsx', [
  'commercial/config',
  'commercial/orders',
  'commercial/flows',
  'commercial/refunds',
  'commercial/reconcile',
]);

includes('frontend/src/pages/commercial/CommercialManagement.tsx', [
  '商业化配置',
  '商业化订单',
  '资产流水',
  '退款记录',
  '轻量对账',
]);

includes('docs/测试文档/商业化-PRD04-测试用例.md', [
  'ADM-04-PAGE-commerce-config',
  'ADM-04-PAGE-commerce-order-list',
  'ADM-04-PAGE-asset-flow-list',
  'ADM-04-PAGE-refund-list',
  'ADM-04-PAGE-commerce-reconcile',
  'GET /admin/commercial/config',
  'POST /admin/finance/orders/{id}/refund',
]);

console.log(`PRD-04 商业化静态闭环校验通过，共 ${checks.length} 项。`);
