-- 知音双动态：心灵搭子精选作者私有配置与新版文案。

INSERT INTO `app_config` (
    `config_key`, `config_value`, `config_group`, `config_type`,
    `public_visible`, `status`, `remark`
) VALUES (
    'community.soulmate_source_phones', '[]', 'COMMUNITY_PRIVATE', 'JSON',
    0,'ENABLED', '心灵搭子展示账号手机号，一行一个，最多50个'
)
ON DUPLICATE KEY UPDATE
    `config_group` = 'COMMUNITY_PRIVATE',
    `config_type` = 'JSON',
    `public_visible` = 0,
    `status` = 'ENABLED',
    `remark` = VALUES(`remark`);

INSERT INTO `app_config` (
    `config_key`, `config_value`, `config_group`, `config_type`,
    `public_visible`, `status`, `remark`
) VALUES
    ('community.copy.config_name_soulmate_source_phones', '心灵搭子展示账号手机号', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '配置名称'),
    ('community.copy.invalid_soulmate_source_phone', '手机号格式错误，请输入有效的11位中国大陆手机号', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '配置校验文案'),
    ('community.copy.too_many_soulmate_source_phones', '心灵搭子展示账号最多配置50个手机号', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '配置校验文案'),
    ('community.copy.station_staff_only', '仅工作人员可发布时空站台', 'COMMUNITY_COPY', 'TEXT', 1, 'ENABLED', '时空站台发布权限文案'),
    ('community.copy.empty_yuemu', '暂时没有心灵搭子动态', 'COMMUNITY_COPY', 'TEXT', 1, 'ENABLED', '小程序空态'),
    ('community.copy.empty_yuemu_description', '后台配置展示账号后，这里会呈现他们的最新动态', 'COMMUNITY_COPY', 'TEXT', 1, 'ENABLED', '小程序空态'),
    ('community.copy.empty_sincere', '暂时没有时空站台内容', 'COMMUNITY_COPY', 'TEXT', 1, 'ENABLED', '小程序空态'),
    ('community.copy.empty_sincere_description', '工作人员发布并审核通过后会在这里展示', 'COMMUNITY_COPY', 'TEXT', 1, 'ENABLED', '小程序空态')
ON DUPLICATE KEY UPDATE
    `config_value` = VALUES(`config_value`),
    `config_group` = VALUES(`config_group`),
    `config_type` = VALUES(`config_type`),
    `public_visible` = VALUES(`public_visible`),
    `status` = VALUES(`status`),
    `remark` = VALUES(`remark`);
