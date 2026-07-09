-- ======================================================
-- 商业化 5 个菜单运行数据维护
-- 目的：让商业化配置、订单、资产流水、退款记录、轻量对账都从数据库取到可验收数据。
-- 说明：前端不得使用假数据兜底；数据库无数据时执行本脚本维护基础运营数据。
-- ======================================================

SET NAMES utf8mb4;

SET @today = CURRENT_DATE;
SET @vip_month_id = (SELECT id FROM app_vip_package WHERE package_name = '月卡VIP' ORDER BY id LIMIT 1);
SET @vip_quarter_id = (SELECT id FROM app_vip_package WHERE package_name = '季卡VIP' ORDER BY id LIMIT 1);
SET @coin_180_id = (SELECT id FROM app_coin_package WHERE package_name = '180千寻币' ORDER BY id LIMIT 1);
SET @coin_500_id = (SELECT id FROM app_coin_package WHERE package_name = '500千寻币' ORDER BY id LIMIT 1);

INSERT INTO app_user_asset (
    user_id, vip_status, vip_expire_time, coin_balance, today_free_whisper_remain,
    total_recharge, last_consume_time, last_purchase_time, deleted
) VALUES
(100281, 'active', TIMESTAMP(@today + INTERVAL 31 DAY, '23:59:59'), 2580, 1, 128.80, TIMESTAMP(@today, '10:22:18'), TIMESTAMP(@today, '10:13:40'), 0),
(100372, 'inactive', NULL, 90, 0, 18.00, TIMESTAMP(@today, '10:32:18'), TIMESTAMP(@today, '10:31:40'), 0),
(100774, 'active', TIMESTAMP(@today + INTERVAL 90 DAY, '23:59:59'), 680, 1, 79.90, TIMESTAMP(@today, '11:10:00'), TIMESTAMP(@today, '10:42:18'), 0)
ON DUPLICATE KEY UPDATE
    vip_status = VALUES(vip_status),
    vip_expire_time = VALUES(vip_expire_time),
    coin_balance = VALUES(coin_balance),
    today_free_whisper_remain = VALUES(today_free_whisper_remain),
    total_recharge = VALUES(total_recharge),
    last_consume_time = VALUES(last_consume_time),
    last_purchase_time = VALUES(last_purchase_time),
    update_time = CURRENT_TIMESTAMP;

INSERT INTO app_trade_order (
    order_no, user_id, order_type, package_id, package_name, pay_amount,
    order_status, success_time, expire_time, refund_time, refund_reason, remark,
    create_time, pay_channel, channel_trade_no, prepay_id, notify_summary, deleted
) VALUES
('ADM04-ORDER-VIP-TODAY-001', 100281, 'vip', @vip_month_id, '月卡VIP', 29.90,
 'success', TIMESTAMP(@today, '10:12:30'), TIMESTAMP(@today, '10:41:58'), NULL, NULL, '商业化菜单验收数据',
 TIMESTAMP(@today, '10:11:58'), 'wechat', 'WXADM04VIPTODAY001', 'wx-prepay-adm04-vip-001', '支付回调已确认', 0),
('ADM04-ORDER-COIN-TODAY-001', 100281, 'coin', @coin_180_id, '180千寻币', 18.00,
 'refunded', TIMESTAMP(@today, '10:13:40'), TIMESTAMP(@today, '10:43:10'), TIMESTAMP(@today, '11:22:00'), '用户重复购买，客服核实后退款', '商业化菜单验收数据',
 TIMESTAMP(@today, '10:13:10'), 'wechat', 'WXADM04COINTODAY001', 'wx-prepay-adm04-coin-001', '支付回调已确认', 0),
('ADM04-ORDER-VIP-TODAY-002', 100372, 'vip', @vip_quarter_id, '季卡VIP', 79.90,
 'unpaid', NULL, TIMESTAMP(@today, '10:50:00'), NULL, NULL, '商业化菜单验收数据',
 TIMESTAMP(@today, '10:20:00'), 'wechat', NULL, 'wx-prepay-adm04-vip-002', NULL, 0),
('ADM04-ORDER-COIN-TODAY-002', 100774, 'coin', @coin_500_id, '500千寻币', 50.00,
 'success', TIMESTAMP(@today, '10:42:18'), TIMESTAMP(@today, '11:11:40'), NULL, NULL, '商业化菜单验收数据',
 TIMESTAMP(@today, '10:41:40'), 'wechat', 'WXADM04COINTODAY002', 'wx-prepay-adm04-coin-002', '支付回调已确认', 0)
ON DUPLICATE KEY UPDATE
    user_id = VALUES(user_id),
    order_type = VALUES(order_type),
    package_id = VALUES(package_id),
    package_name = VALUES(package_name),
    pay_amount = VALUES(pay_amount),
    order_status = VALUES(order_status),
    success_time = VALUES(success_time),
    expire_time = VALUES(expire_time),
    refund_time = VALUES(refund_time),
    refund_reason = VALUES(refund_reason),
    remark = VALUES(remark),
    create_time = VALUES(create_time),
    pay_channel = VALUES(pay_channel),
    channel_trade_no = VALUES(channel_trade_no),
    prepay_id = VALUES(prepay_id),
    notify_summary = VALUES(notify_summary),
    update_time = CURRENT_TIMESTAMP,
    deleted = 0;

SET @coin_refund_order_id = (SELECT id FROM app_trade_order WHERE order_no = 'ADM04-ORDER-COIN-TODAY-001' LIMIT 1);
SET @coin_success_order_id = (SELECT id FROM app_trade_order WHERE order_no = 'ADM04-ORDER-COIN-TODAY-002' LIMIT 1);

INSERT INTO app_user_coin_log (
    flow_no, user_id, flow_type, change_amount, balance_before, balance_after,
    biz_scene, biz_desc, ref_id, ref_type, create_time, deleted
) VALUES
('ADM04-FLOW-RECHARGE-001', 100281, 'recharge', 180, 2400, 2580,
 '千寻币充值', '180千寻币充值到账', @coin_refund_order_id, 'order', TIMESTAMP(@today, '10:13:40'), 0),
('ADM04-FLOW-CONSUME-001', 100281, 'consume', -8, 2580, 2572,
 '解锁喜欢我的单条', '单条解锁扣币', NULL, 'unlock_record', TIMESTAMP(@today, '10:18:02'), 0),
('ADM04-FLOW-REFUND-001', 100281, 'refund', 180, 2572, 2752,
 '订单退款', '订单 ADM04-ORDER-COIN-TODAY-001 退款退回千寻币', @coin_refund_order_id, 'refund_record', TIMESTAMP(@today, '11:22:00'), 0),
('ADM04-FLOW-RECHARGE-002', 100774, 'recharge', 500, 180, 680,
 '千寻币充值', '500千寻币充值到账', @coin_success_order_id, 'order', TIMESTAMP(@today, '10:42:18'), 0)
ON DUPLICATE KEY UPDATE
    user_id = VALUES(user_id),
    flow_type = VALUES(flow_type),
    change_amount = VALUES(change_amount),
    balance_before = VALUES(balance_before),
    balance_after = VALUES(balance_after),
    biz_scene = VALUES(biz_scene),
    biz_desc = VALUES(biz_desc),
    ref_id = VALUES(ref_id),
    ref_type = VALUES(ref_type),
    create_time = VALUES(create_time),
    update_time = CURRENT_TIMESTAMP,
    deleted = 0;

INSERT INTO app_refund_record (
    refund_no, order_id, order_no, user_id, refund_amount, refund_reason,
    refund_status, operator_id, operator_name, asset_rollback_action,
    channel_refund_no, channel_refund_status, channel_response_summary,
    refund_time, create_time, deleted
) VALUES
('ADM04-RF-TODAY-001', @coin_refund_order_id, 'ADM04-ORDER-COIN-TODAY-001', 100281, 18.00, '用户重复购买，客服核实后退款',
 'success', 1, 'peter', 'coin_balance_rollback',
 'WXRFADM04TODAY001', 'success', '退款已同步，资产流水已写入',
 TIMESTAMP(@today, '11:22:00'), TIMESTAMP(@today, '11:22:00'), 0)
ON DUPLICATE KEY UPDATE
    order_id = VALUES(order_id),
    order_no = VALUES(order_no),
    user_id = VALUES(user_id),
    refund_amount = VALUES(refund_amount),
    refund_reason = VALUES(refund_reason),
    refund_status = VALUES(refund_status),
    operator_id = VALUES(operator_id),
    operator_name = VALUES(operator_name),
    asset_rollback_action = VALUES(asset_rollback_action),
    channel_refund_no = VALUES(channel_refund_no),
    channel_refund_status = VALUES(channel_refund_status),
    channel_response_summary = VALUES(channel_response_summary),
    refund_time = VALUES(refund_time),
    create_time = VALUES(create_time),
    update_time = CURRENT_TIMESTAMP,
    deleted = 0;

DELETE FROM app_commercial_config_log
WHERE config_version = CONCAT('COMM-SEED-', DATE_FORMAT(@today, '%Y%m%d'), '-001');

INSERT INTO app_commercial_config_log (
    config_version, change_module, change_summary, operator_id, operator_name,
    before_snapshot, after_snapshot, create_time, deleted
) VALUES (
    CONCAT('COMM-SEED-', DATE_FORMAT(@today, '%Y%m%d'), '-001'),
    'commercial',
    '商业化菜单数据库数据维护',
    1,
    'peter',
    JSON_OBJECT('source', 'database-seed-before'),
    JSON_OBJECT('source', 'database-seed-after'),
    TIMESTAMP(@today, '09:20:00'),
    0
);
