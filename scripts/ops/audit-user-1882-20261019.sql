-- 只读生产审计：确认 app_user 主键 1882 是否存在。
-- 不查询或输出手机号、openid 等敏感字段。

SET SESSION TRANSACTION READ ONLY;
START TRANSACTION READ ONLY;

SELECT
    1882 AS queried_user_id,
    COUNT(*) AS total_rows,
    COALESCE(SUM(CASE WHEN deleted = 0 THEN 1 ELSE 0 END), 0) AS active_rows,
    COALESCE(SUM(CASE WHEN deleted <> 0 THEN 1 ELSE 0 END), 0) AS deleted_rows,
    COALESCE(MAX(CASE WHEN deleted = 0 THEN account_status END), 'NOT_FOUND') AS active_account_status
FROM app_user
WHERE id = 1882;

COMMIT;
