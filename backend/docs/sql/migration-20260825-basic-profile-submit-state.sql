-- 区分“首登准入五项完成”和“认证基础资料已提交”。
-- 新账号首登完成后仍为 0；只有认证基础资料 PUT 接口保存成功后才写为 1。
ALTER TABLE app_user
    ADD COLUMN basic_profile_completed TINYINT NOT NULL DEFAULT 0
    COMMENT '是否已在认证流程提交完整基础资料'
    AFTER first_login_next_step;

-- 兼容升级前已经补充过认证资料的存量账号，避免要求其重复填写。
UPDATE app_user
SET basic_profile_completed = 1
WHERE deleted = 0
  AND (
      (height IS NOT NULL AND weight IS NOT NULL)
      OR hometown_province IS NOT NULL
      OR hometown_city IS NOT NULL
      OR marital_status IS NOT NULL
      OR occupation IS NOT NULL
      OR annual_income IS NOT NULL
  );
