const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..', '..')
const migrationPath = path.join(projectRoot, 'deploy/sql/prod/050_prd01_handoff_runtime_contract_fix.sql')
const onboardingMigrationPath = path.join(projectRoot, 'deploy/sql/prod/051_prd01_verification_onboarding_copy.sql')
const lanhuClosureMigrationPath = path.join(projectRoot, 'deploy/sql/prod/052_prd01_verification_lanhu_closure.sql')
const profileEditMigrationPath = path.join(projectRoot, 'deploy/sql/prod/053_prd01_profile_edit_copy.sql')

assert.ok(fs.existsSync(migrationPath), '缺少 050 运行时契约修复迁移')
assert.ok(fs.existsSync(onboardingMigrationPath), '缺少 051 认证强引导文案迁移')
assert.ok(fs.existsSync(lanhuClosureMigrationPath), '缺少 052 认证蓝湖闭环文案迁移')
assert.ok(fs.existsSync(profileEditMigrationPath), '缺少 053 编辑资料与我的认证动态文案迁移')

const sql = fs.readFileSync(migrationPath, 'utf8')
const onboardingSql = fs.readFileSync(onboardingMigrationPath, 'utf8')
const lanhuClosureSql = fs.readFileSync(lanhuClosureMigrationPath, 'utf8')
const profileEditSql = fs.readFileSync(profileEditMigrationPath, 'utf8')
assert.match(sql, /prd01\.upload\.rules/, '迁移必须修复统一上传规则配置')
assert.match(sql, /"key"\s*:\s*"voice"/, '迁移必须补齐 voice 上传规则')
assert.match(sql, /"format"\s*:\s*"mp3"/, 'voice 上传格式必须是录音管理器支持的 mp3')
assert.match(sql, /"minDuration"\s*:\s*"10"/, 'voice 最短时长必须落入统一配置')
assert.match(sql, /"maxDuration"\s*:\s*"60"/, 'voice 最长时长必须落入统一配置')
assert.match(sql, /"key"\s*:\s*"profileBg"/, '迁移必须修复 profileBg 上传规则')
assert.match(sql, /"maxCount"\s*:\s*"1"/, 'profileBg 最多只能提交一张')
assert.match(sql, /JSON_SEARCH/, '迁移必须保留其他后台配置行并按 key 查找')
assert.match(sql, /JSON_SET/, '已有配置必须按字段修正，不能整包覆盖')
assert.match(sql, /JSON_ARRAY_APPEND/, '缺失规则必须追加，不能整包覆盖')
for (const copyKey of [
  'common_loading_action',
  'common_load_failed_title',
  'common_load_failed_message',
  'common_retry_action',
]) {
  assert.match(sql, new RegExp(`"copyKey"\\s*:\\s*"${copyKey}"`), `迁移必须补齐认证运行态文案 ${copyKey}`)
}

for (const copyKey of [
  'verification_onboarding_heading',
  'verification_step_basic',
  'verification_step_avatar',
  'verification_step_intro',
  'verification_step_triple',
  'verification_home_partial_notice',
  'verification_home_basic_title',
  'verification_home_avatar_intro_title',
  'verification_home_triple_title',
  'avatar_guide_title',
  'avatar_choose_action',
  'intro_placeholder',
  'triple_safety_notice',
]) {
  assert.match(onboardingSql, new RegExp(`"copyKey"\\s*:\\s*"${copyKey}"`), `051 必须补齐认证强引导文案 ${copyKey}`)
}
assert.match(onboardingSql, /JSON_SEARCH/, '051 必须按 copyKey 幂等追加')
assert.match(onboardingSql, /JSON_MERGE_PRESERVE/, '051 禁止覆盖后台已有文案')

for (const copyKey of [
  'profile_basic_nav_title',
  'profile_basic_heading',
  'profile_basic_notice',
  'common_save_action',
  'common_saving_action',
  'common_save_success',
  'verification_status_avatar',
  'education_tab_student',
  'education_method_section_title',
  'education_upload_count_template',
  'education_chsi_step_four_desc',
  'avatar_crop_export_failed',
]) {
  assert.match(lanhuClosureSql, new RegExp(`"copyKey"\\s*:\\s*"${copyKey}"`), `052 必须补齐蓝湖认证文案 ${copyKey}`)
}
assert.match(lanhuClosureSql, /JSON_SEARCH/, '052 必须按 copyKey 幂等补齐')
assert.match(lanhuClosureSql, /app_education_method/, '052 必须同步学历方式字典')

for (const copyKey of [
  'common_input_placeholder',
  'verification_detail_heading',
  'verification_detail_notice',
  'verification_detail_verified',
  'verification_detail_update_action',
  'verification_detail_safety_notice',
]) {
  assert.match(profileEditSql, new RegExp(`"copyKey"\\s*:\\s*"${copyKey}"`), `053 必须补齐编辑资料动态文案 ${copyKey}`)
}
assert.match(profileEditSql, /JSON_SEARCH/, '053 必须按 copyKey 幂等补齐')

console.log('handoff runtime SQL contract: ok')
