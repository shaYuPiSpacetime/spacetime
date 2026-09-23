-- 为全部预置协议和内容提供同源阅读页；正文仍以 content_article 为唯一数据源。
-- 此脚本不会替换甲方已提供的协议正文或有效 H5 地址。待配置文案由阅读页明确显示为尚未发布。

INSERT INTO content_article (
    content_code, version, preinitialized, type, category, title, summary,
    content_type, content_url, content_body, sort, status,
    effective_time, create_time, update_time, deleted
)
SELECT 'coin_recharge_agreement', 'v1.0', 1, 'AGREEMENT', 'PROTOCOL',
       '时空邂逅充值协议', '千寻币充值与使用规则', 'H5',
       'https://admin.shikongxiehou.com/h5/compliance/index.html?code=coin_recharge_agreement',
       '请配置时空邂逅充值协议正式正文。', 26, 'ENABLED',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1 FROM content_article
     WHERE content_code = 'coin_recharge_agreement' AND deleted = 0
);

INSERT INTO content_article (
    content_code, version, preinitialized, type, category, title, summary,
    content_type, content_url, content_body, sort, status,
    effective_time, create_time, update_time, deleted
)
SELECT 'education_verification_agreement', 'v1.0', 1, 'AGREEMENT', 'PROTOCOL',
       '学历信息认证服务协议', '学历认证资料处理规则', 'H5',
       'https://admin.shikongxiehou.com/h5/compliance/index.html?code=education_verification_agreement',
       '请配置学历信息认证服务协议正式正文。', 41, 'ENABLED',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1 FROM content_article
     WHERE content_code = 'education_verification_agreement' AND deleted = 0
);

UPDATE content_article
   SET content_url = CASE
         WHEN content_url IS NULL OR TRIM(content_url) = ''
              OR content_url LIKE 'https://spacetime.app/agreement/%'
         THEN CONCAT('https://admin.shikongxiehou.com/h5/compliance/index.html?code=', content_code)
         ELSE content_url
       END,
       content_type = 'H5',
       update_time = CURRENT_TIMESTAMP
 WHERE content_code IN (
       'user_agreement', 'privacy_policy', 'privacy_summary',
       'single_commitment', 'education_verification_agreement',
       'account_cancellation', 'third_party_list', 'personal_info_list',
       'platform_rule', 'vip_service_agreement', 'coin_recharge_agreement',
       'announcement', 'help_service'
 )
   AND deleted = 0;

INSERT INTO sys_dict_data (
    dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark,
    create_time, update_time, deleted
)
SELECT 'compliance_content_type', 0, '充值协议', 'coin_recharge_agreement', 26,
       'ENABLED', '千寻币充值与使用规则', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data
     WHERE dict_type = 'compliance_content_type'
       AND dict_value = 'coin_recharge_agreement' AND deleted = 0
);

INSERT INTO sys_dict_data (
    dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark,
    create_time, update_time, deleted
)
SELECT 'compliance_content_type', 0, '学历认证协议', 'education_verification_agreement', 41,
       'ENABLED', '学历认证资料处理规则', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data
     WHERE dict_type = 'compliance_content_type'
       AND dict_value = 'education_verification_agreement' AND deleted = 0
);
