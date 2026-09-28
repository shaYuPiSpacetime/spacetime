-- 官网允许访客提交不良信息举报和隐私联系；重复执行不清除既有举报。
SET @website_contact_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'website_report' AND column_name = 'contact'
);
SET @website_contact_ddl := IF(
  @website_contact_exists = 0,
  'ALTER TABLE website_report ADD COLUMN contact VARCHAR(120) NULL AFTER reason',
  'SELECT 1'
);
PREPARE website_contact_stmt FROM @website_contact_ddl;
EXECUTE website_contact_stmt;
DEALLOCATE PREPARE website_contact_stmt;

ALTER TABLE website_report MODIFY COLUMN reporter_id BIGINT NULL;
