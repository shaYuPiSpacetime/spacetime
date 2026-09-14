-- 会员中心“时空邂逅会员服务协议”动态内容。
-- 可重复执行：仅在内容不存在或正文为空时写入默认正文，不覆盖后台已编辑内容。

INSERT INTO content_article (
    content_code, version, preinitialized, type, category, title, summary,
    content_type, content_url, content_body, sort, status,
    effective_time, create_time, update_time, deleted
)
SELECT
    'vip_service_agreement', 'v1.0', 1, 'AGREEMENT', 'PROTOCOL',
    '时空邂逅会员服务协议', '会员购买、使用与续费规则',
    'NATIVE', NULL,
    '<p>欢迎使用时空邂逅会员服务。请在购买前仔细核对会员套餐、价格、有效期及页面展示的具体权益。</p><p>会员权益仅限购买账号本人使用，自支付成功后生效，不得转让、出租或用于违法违规活动。</p><p>部分权益会受账号状态、实名认证状态及平台安全规则限制；具体可用次数和范围以会员中心实时展示为准。</p><p>如发生重复扣款、服务未到账或其他支付异常，请通过平台客服提交订单信息。符合退款条件的订单将按原支付渠道处理，实际到账时间以支付渠道为准。</p><p>平台可基于法律法规、产品能力或运营需要调整会员服务，并会通过页面公告等合理方式提示重要变化。</p><p>点击同意并支付，即表示你已阅读并同意本协议及平台用户协议、隐私政策。</p>',
    25, 'ENABLED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1
      FROM content_article
     WHERE content_code = 'vip_service_agreement'
       AND deleted = 0
);

UPDATE content_article
   SET preinitialized = 1,
       type = 'AGREEMENT',
       category = 'PROTOCOL',
       title = CASE
           WHEN title IS NULL OR TRIM(title) = '' THEN '时空邂逅会员服务协议'
           ELSE title
       END,
       summary = CASE
           WHEN summary IS NULL OR TRIM(summary) = '' THEN '会员购买、使用与续费规则'
           ELSE summary
       END,
       content_type = CASE
           WHEN (content_url IS NULL OR TRIM(content_url) = '')
                AND (content_body IS NULL OR TRIM(content_body) = '') THEN 'NATIVE'
           ELSE content_type
       END,
       content_body = CASE
           WHEN (content_url IS NULL OR TRIM(content_url) = '')
                AND (content_body IS NULL OR TRIM(content_body) = '')
           THEN '<p>欢迎使用时空邂逅会员服务。请在购买前仔细核对会员套餐、价格、有效期及页面展示的具体权益。</p><p>会员权益仅限购买账号本人使用，自支付成功后生效，不得转让、出租或用于违法违规活动。</p><p>部分权益会受账号状态、实名认证状态及平台安全规则限制；具体可用次数和范围以会员中心实时展示为准。</p><p>如发生重复扣款、服务未到账或其他支付异常，请通过平台客服提交订单信息。符合退款条件的订单将按原支付渠道处理，实际到账时间以支付渠道为准。</p><p>平台可基于法律法规、产品能力或运营需要调整会员服务，并会通过页面公告等合理方式提示重要变化。</p><p>点击同意并支付，即表示你已阅读并同意本协议及平台用户协议、隐私政策。</p>'
           ELSE content_body
       END,
       status = 'ENABLED',
       effective_time = COALESCE(effective_time, CURRENT_TIMESTAMP),
       update_time = CURRENT_TIMESTAMP
 WHERE content_code = 'vip_service_agreement'
   AND deleted = 0;

UPDATE sys_dict_data
   SET dict_label = '会员服务协议',
       dict_sort = 25,
       status = 'ENABLED',
       remark = '时空邂逅会员购买与服务规则',
       update_time = CURRENT_TIMESTAMP,
       deleted = 0
 WHERE dict_type = 'compliance_content_type'
   AND dict_value = 'vip_service_agreement';

INSERT INTO sys_dict_data (
    dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark,
    create_time, update_time, deleted
)
SELECT
    'compliance_content_type', 0, '会员服务协议', 'vip_service_agreement', 25,
    'ENABLED', '时空邂逅会员购买与服务规则', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1
      FROM sys_dict_data
     WHERE dict_type = 'compliance_content_type'
       AND dict_value = 'vip_service_agreement'
       AND deleted = 0
);
