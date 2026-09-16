-- 微信虚拟支付线上版本商品价格对齐（2026-09-16 截图确认）。
-- 可重复执行，结果相同；不修改历史交易订单或支付记录。
-- 后续若微信线上价格变更，必须同时更新本迁移、后端目录和管理后台目录。
-- 执行前在生产库只读核对了六个 ID、套餐名称和会员时长；千寻币到账数量一并对齐截图。

SET NAMES utf8mb4;

-- 任一套餐 ID 与业务名称/时长不一致时通过主键冲突中断迁移，避免更新错误商品。
CREATE TEMPORARY TABLE virtual_product_price_preflight (ok TINYINT PRIMARY KEY);
INSERT INTO virtual_product_price_preflight (ok) VALUES (1);
INSERT INTO virtual_product_price_preflight (ok)
SELECT IF(
    (SELECT COUNT(*) FROM app_vip_package WHERE deleted = 0 AND (
        (id = 7 AND package_name = '月卡会员' AND duration_days = 30)
        OR (id = 8 AND package_name = '年卡会员' AND duration_days = 365)
        OR (id = 10 AND package_name = '季卡会员' AND duration_days = 90)
    )) = 3
    AND (SELECT COUNT(*) FROM app_coin_package WHERE deleted = 0 AND (
        (id = 10 AND package_name = '1000千寻币')
        OR (id = 11 AND package_name = '3000千寻币')
        OR (id = 12 AND package_name = '6000千寻币')
    )) = 3,
    2, 1
);
DROP TEMPORARY TABLE virtual_product_price_preflight;

SELECT id, package_name, price, status
FROM app_vip_package
WHERE id IN (7, 8, 10) AND deleted = 0
ORDER BY id;

SELECT id, package_name, amount, discount_amount, status
FROM app_coin_package
WHERE id IN (10, 11, 12) AND deleted = 0
ORDER BY id;

START TRANSACTION;

UPDATE app_vip_package
SET price = CASE id
        WHEN 7 THEN 0.01
        WHEN 8 THEN 1.00
        WHEN 10 THEN 1000.00
    END,
    origin_price = GREATEST(COALESCE(origin_price, 0), CASE id
        WHEN 7 THEN 0.01
        WHEN 8 THEN 1.00
        WHEN 10 THEN 1000.00
    END),
    update_time = CURRENT_TIMESTAMP
WHERE id IN (7, 8, 10) AND deleted = 0;

UPDATE app_coin_package
SET amount = CASE id
        WHEN 10 THEN 99.00
        WHEN 11 THEN 268.00
        WHEN 12 THEN 428.00
    END,
    discount_amount = CASE id
        WHEN 10 THEN 99.00
        WHEN 11 THEN 268.00
        WHEN 12 THEN 428.00
    END,
    coin_count = CASE id
        WHEN 10 THEN 1000
        WHEN 11 THEN 3000
        WHEN 12 THEN 6000
    END,
    origin_amount = GREATEST(COALESCE(origin_amount, 0), CASE id
        WHEN 10 THEN 99.00
        WHEN 11 THEN 268.00
        WHEN 12 THEN 428.00
    END),
    update_time = CURRENT_TIMESTAMP
WHERE id IN (10, 11, 12) AND deleted = 0;

COMMIT;

SELECT id, package_name, price, status
FROM app_vip_package
WHERE id IN (7, 8, 10) AND deleted = 0
ORDER BY id;

SELECT id, package_name, coin_count, amount, discount_amount, status
FROM app_coin_package
WHERE id IN (10, 11, 12) AND deleted = 0
ORDER BY id;
