-- 悄悄话预检查要求启用场景的单价为正；仅修复旧环境中遗留的零单价。
-- 默认 12 千寻币与 schema-commercial.sql 的初始配置一致，不覆盖运营后续设置的正价。
UPDATE app_coin_scene_config
   SET unit_price = 12,
       update_time = CURRENT_TIMESTAMP
 WHERE scene_code = 'whisper'
   AND status = 'ENABLED'
   AND unit_price = 0
   AND deleted = 0;
