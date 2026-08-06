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

function excludes(path, snippets) {
  const text = file(path);
  snippets.forEach((snippet) => {
    checks.push(`${path} 不包含 ${snippet}`);
    if (text.includes(snippet)) {
      throw new Error(`${path} 不应包含: ${snippet}`);
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
  'backend/src/main/java/com/spacetime/admin/dto/request/FlowPageReq.java',
  'backend/src/main/java/com/spacetime/admin/dto/response/CoinFlowVO.java',
  'backend/src/main/java/com/spacetime/admin/service/impl/FinanceAdminServiceImpl.java',
  'docs/测试文档/商业化-PRD04-query-regression.mjs',
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

includes('deploy/sql/prod/031_commercial_demo_menu_alignment.sql', [
  '移动端配置',
  '财务中心',
  '商业化配置',
  '商业化订单',
  '资产流水',
  '退款记录',
  '轻量对账',
  'id = 820',
  'visible = 0',
]);

includes('deploy/sql/prod/032_commercial_config_data_alignment.sql', [
  'app_coin_scene_config',
  '发送悄悄话（单次）',
  '查看谁喜欢我（单次）',
  '千寻币',
  'CONCAT(\'成\', \'家币\')',
]);

includes('deploy/sql/prod/033_commercial_runtime_data_seed.sql', [
  'app_trade_order',
  'app_user_coin_log',
  'app_refund_record',
  'app_commercial_config_log',
  'CURRENT_DATE',
  'ADM04-ORDER',
  'ADM04-RF',
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
  'ADM-04-PAGE-commerce-config',
  'ADM-04-PAGE-commerce-order-list',
  'ADM-04-PAGE-asset-flow-list',
  'ADM-04-PAGE-refund-list',
  'ADM-04-PAGE-commerce-reconcile',
  '商业化配置',
  '移动端配置管理 / 商业化配置',
  '会员权益',
  '会员套餐',
  '千寻币套餐',
  '千寻币消费场景',
  '解锁保留期',
  '社交与订单参数',
  '曝光包预留',
  '商业化订单',
  '商业化订单管理',
  '资产流水',
  '资产流水管理',
  '退款记录',
  '退款记录管理',
  '轻量对账',
  'commerce-tabs',
  'config-workbench',
  'query-panel',
  'table-wrap',
  'drawer-backdrop',
  'modal-backdrop',
  'configLogDrawer',
  'orderDrawer',
  'flowDrawer',
  'refundDrawer',
  'configSaveModal',
  'refundApplyModal',
  'exportModal',
  'handleConfigTabChange',
  'onClick={() => handleConfigTabChange(tab.key)}',
  'await load();',
  'EmptyTableRow',
  'dateRange',
  'orderNo: filters.orderNo',
  'userId: filters.userId ? Number(filters.userId) : undefined',
  'assetType: filters.assetType',
  '<option value="coin">千寻币</option>',
  '<option value="vip">会员权益</option>',
  '<th>套餐编号</th><th>套餐名称</th><th>套餐类型</th><th>购买方式</th><th>原价</th><th>优惠价</th><th>有效天数</th><th>标签</th><th>状态</th><th>操作</th>',
  '<th>消费场景</th><th>场景 code</th><th>移动端展示名称</th><th>移动端图标配置</th><th>说明</th><th>单价</th><th>启停</th><th>影响页面</th>',
  '理想型/合拍/知音保留天数',
  '默认 90 天，合拍的人与知音-觅知音复用。',
  '首版固定 30 分钟，不提供后台配置。',
  '预留说明文案',
]);

includes('docs/静态Demo/04-商业化（VIP、千寻币、解锁与资产中心）/html/admin.html', [
  '<th>套餐编号</th><th>套餐名称</th><th>套餐类型</th><th>购买方式</th><th>原价</th><th>优惠价</th><th>有效天数</th><th>标签</th><th>状态</th><th>操作</th>',
  '<th>消费场景</th><th>场景 code</th><th>移动端展示名称</th><th>移动端图标配置</th><th>说明</th><th>单价</th><th>启停</th><th>影响页面</th>',
  '会员套餐（一次性购买）',
  '理想型/合拍/知音保留天数',
  '首版固定 30 分钟，不提供后台配置。',
  '预留说明文案',
]);

includes('docs/静态Demo/04-商业化（VIP、千寻币、解锁与资产中心）/html/assets/demo.js', [
  'const rows = data.vipPackages || [];',
  '<td>普通套餐</td>',
  '<td>一次性购买</td>',
  '<td>APP 付费弹窗 / 来源业务页</td>',
  "${item.status === 'on' ? '下架' : '上架'}",
]);

excludes('docs/静态Demo/04-商业化（VIP、千寻币、解锁与资产中心）/html/admin.html', [
  '普通套餐 / 连续订阅套餐',
  '连续订阅校验',
  '微信连续订阅商品',
]);

includes('frontend/src/api/commercial.ts', [
  'assetType?: string;',
]);

includes('backend/src/main/java/com/spacetime/admin/dto/request/FlowPageReq.java', [
  'private String assetType;',
]);

includes('backend/src/main/java/com/spacetime/admin/dto/response/CoinFlowVO.java', [
  'private String assetType;',
]);

includes('backend/src/main/java/com/spacetime/admin/service/impl/FinanceAdminServiceImpl.java', [
  'isCoinAssetType(req.getAssetType())',
  'emptyCoinFlowPage(req)',
  'vo.setAssetType("coin")',
]);

includes('docs/测试文档/商业化-PRD04-query-regression.mjs', [
  'assetType=vip',
  'assetType=coin',
  "orderNo: 'ADM04-ORDER-COIN-TODAY-001'",
  'userId: 100281',
]);

const bannedSnippets = [
  '商业化' + '中心',
  '成' + '家币',
  'S' + 'VIP',
  '高端' + '服务',
  '积分' + '管理',
  '订阅状态' + '同步',
  '代用户取消' + '续费',
  '退款状态' + '筛选',
];

excludes('frontend/src/pages/commercial/CommercialManagement.tsx', bannedSnippets);

excludes('frontend/src/pages/commercial/CommercialManagement.tsx', [
  'FALLBACK_',
  'FIXED_BENEFITS',
  'FIXED_SCENES',
  'ORD-20260630',
  '18,420',
  '2026-06-30',
  'rows.length ? rows :',
  'setOrders(FALLBACK',
  'setFlows(FALLBACK',
  'setRefunds(FALLBACK',
  'return FALLBACK',
  '订单/用户搜索',
]);

excludes('backend/src/main/java/com/spacetime/admin/service/impl/CommercialAdminServiceImpl.java', [
  'defaultScenes',
  'defaultScene(',
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
