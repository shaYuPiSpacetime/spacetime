-- =============================================================
-- VIP 套餐统一为普通套餐和一次性购买
-- 说明：退役连续订阅商品、协议和自动续费周期；保留字段兼容历史版本。
-- =============================================================

SET NAMES utf8mb4;

UPDATE app_vip_package
   SET package_name = CASE package_name
           WHEN '连续包年' THEN '年卡会员'
           WHEN '连续包季' THEN '季卡会员'
           WHEN '连续包月' THEN '月卡会员'
           ELSE COALESCE(
               NULLIF(TRIM(REPLACE(REPLACE(package_name, '连续订阅', ''), '连续', '')), ''),
               CONCAT('会员套餐-', id)
           )
       END,
       package_type = 'normal',
       subscription_type = 'once',
       wechat_product_id = NULL,
       agreement_config = NULL,
       update_time = CURRENT_TIMESTAMP
 WHERE deleted = 0
   AND (
       package_type <> 'normal'
       OR package_type IS NULL
       OR subscription_type <> 'once'
       OR subscription_type IS NULL
       OR wechat_product_id IS NOT NULL
       OR agreement_config IS NOT NULL
       OR package_name LIKE '%连续%'
   );

ALTER TABLE app_vip_package
    MODIFY COLUMN package_type VARCHAR(30) DEFAULT 'normal' COMMENT '套餐类型，固定 normal（普通套餐）',
    MODIFY COLUMN subscription_type VARCHAR(30) DEFAULT 'once' COMMENT '购买方式，固定 once（一次性购买）';

SELECT
    COUNT(*) AS active_package_count,
    SUM(CASE
        WHEN package_type <> 'normal'
          OR subscription_type <> 'once'
          OR wechat_product_id IS NOT NULL
          OR agreement_config IS NOT NULL
          OR package_name LIKE '%连续%'
        THEN 1 ELSE 0
    END) AS invalid_package_count
  FROM app_vip_package
 WHERE deleted = 0;
