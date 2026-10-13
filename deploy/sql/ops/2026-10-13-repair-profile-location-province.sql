-- 单账号修复，不属于自动生产迁移。须在事务内锁定并核对目标 app_user 后执行。
-- 执行器设置 @target_user_id、@expected_phone_hash (SHA256)、
-- @expected_province_code、@expected_city_code、@expected_parent_code。
-- 未设置参数或原值漂移时不更新；调用者须断言第一次1行，幂等重试0行。
-- 只纠正误填为城市编码的现居省份；不得修改完成标志、城市/区县、家乡、审核状态。
UPDATE app_user u
JOIN sys_dict_data city
  ON city.dict_type = 'china_region' AND CAST(city.dict_value AS BINARY) = CAST(u.location_city AS BINARY)
  AND city.status = 'ENABLED' AND city.deleted = 0
JOIN sys_dict_data province
  ON province.id = city.parent_id AND province.parent_id = 0
  AND province.dict_type = 'china_region' AND province.status = 'ENABLED' AND province.deleted = 0
SET u.location_province = province.dict_value, u.update_time = CURRENT_TIMESTAMP
WHERE u.id = @target_user_id AND u.deleted = 0
  AND CAST(SHA2(u.phone, 256) AS BINARY) = CAST(@expected_phone_hash AS BINARY)
  AND CAST(u.location_province AS BINARY) = CAST(@expected_province_code AS BINARY)
  AND CAST(u.location_city AS BINARY) = CAST(@expected_city_code AS BINARY)
  AND CAST(@expected_province_code AS BINARY) = CAST(@expected_city_code AS BINARY)
  AND CAST(province.dict_value AS BINARY) = CAST(@expected_parent_code AS BINARY)
  AND CAST(u.location_province AS BINARY) <> CAST(province.dict_value AS BINARY);
