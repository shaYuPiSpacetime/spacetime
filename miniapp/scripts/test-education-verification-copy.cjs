/* eslint-env node */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '../..')
const migrationPath = path.join(root, 'deploy/sql/prod/112_education_verification_retry_copy.sql')
const expectedCopy = {
  education_school_invalid: '请输入2–100字的学校名称',
  education_school_selection_required: '旧学校信息未确认，请重新搜索并点选学校',
  education_level_required: '请选择有效的学历',
  education_chsi_invalid: '学信网在线验证码需为12–18位字母或数字',
  education_diploma_invalid: '请填写有效的证书编号，最多64字',
  education_certificate_name_invalid: '请填写证书姓名，最多50字',
  education_material_required: '请至少上传1张学历证明材料',
  education_material_limit_invalid: '学历证明材料最多{max}张，请删除多余材料',
  education_resubmit_action: '重新提交',
  education_reselect_school_action: '重新选择学校',
  education_material_replace_action: '替换',
  education_material_remove_action: '删除',
  education_material_preview_failed: '材料预览失败，可重试或替换',
  education_school_search_empty: '未找到学校，请修改名称后重新搜索或联系客服',
  education_school_search_failed: '学校搜索失败，请重新搜索',
  education_submit_success_notice: '学历认证已提交，请耐心等待审核',
}

function jsonRows(sql) {
  return [...sql.matchAll(/SET\s+@\w+\s*=\s*'(\{"rows":\[[\s\S]*?\]\})'\s*;/gi)]
    .flatMap(match => JSON.parse(match[1]).rows)
}

function migrationSql() {
  return fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : ''
}

test('E01/E03-E08/E15: migration provides every education copy key once with agreed text', () => {
  // Before the new migration exists, inspect the real seed to expose the missing keys.
  const sql = migrationSql() || fs.readFileSync(
    path.join(root, 'deploy/sql/prod/049_prd01_verification_runtime_seed.sql'), 'utf8')
  const rows = jsonRows(sql)
  const missing = Object.keys(expectedCopy).filter(key => !rows.some(row => row.copyKey === key))
  assert.deepEqual(missing, [], `Missing retry copy keys: ${missing.join(', ')}`)
  assert.equal(rows.length, Object.keys(expectedCopy).length)
  assert.equal(new Set(rows.map(row => row.copyKey)).size, rows.length)
  for (const row of rows) {
    assert.equal(row.content, expectedCopy[row.copyKey], row.copyKey)
    assert.equal(row.enabled, true)
    assert.ok(row.group && row.scene)
  }
  const template = rows.find(row => row.copyKey === 'education_material_limit_invalid').content
  assert.equal(template.replace('{max}', '2'), '学历证明材料最多2张，请删除多余材料')
})

test('E01/E03-E08/E15: UI and domain use the deployed copy keys and max template', () => {
  const sourcePaths = [
    'miniapp/src/domain/educationVerification.ts',
    'miniapp/src/hooks/useEducationVerification.ts',
    'miniapp/src/pages/verification/components/EducationSubmitPage.tsx',
    'miniapp/src/pages/verification/components/VerificationCenterPage.tsx',
    'miniapp/src/pages/verification/my-certification.tsx',
    'miniapp/src/pages/verification/education-submit-success.tsx',
  ]
  const source = sourcePaths.filter(file => fs.existsSync(path.join(root, file)))
    .map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')
  for (const key of Object.keys(expectedCopy)) {
    assert.ok(source.includes(`'${key}'`), `Unused/mismatched deployed key: ${key}`)
  }
  assert.match(source, /replace\('\{max\}',\s*String\(/)
})

test('configuration migration only appends missing keys to a valid existing copy configuration', () => {
  const sql = migrationSql().replace(/--[^\n]*/g, '')
  assert.match(sql, /JSON_TABLE\(/i)
  assert.match(sql, /JSON_SEARCH\([\s\S]*?\$\.rows\[\*\]\.copyKey[\s\S]*?IS NULL/i)
  // JSON_SEARCH uses LIKE patterns: escape underscores for an exact copyKey lookup.
  assert.match(sql, /REPLACE\(defaults_row\.copy_key, '_', '!_'\), '!'/)
  assert.match(sql, /REPLACE\(missing_row\.copy_key, '_', '!_'\), '!'/)
  assert.match(sql, /JSON_MERGE_PRESERVE\(/i)
  assert.match(sql, /JSON_VALID\(/i)
  assert.match(sql, /CASE WHEN JSON_VALID\(target\.config_value\) = 1/i)
  assert.match(sql, /JSON_TYPE\([\s\S]*?= 'ARRAY'/i)
  assert.match(sql, /target\.config_key = 'prd01\.copy\.rules'/i)
  assert.match(sql, /target\.deleted = 0/i)
  assert.match(sql, /EXISTS\s*\([\s\S]*?JSON_TABLE\(/i)
  assert.doesNotMatch(sql, /(?:INSERT\s+INTO|DELETE\s+FROM|REPLACE\s+INTO|TRUNCATE)/i)
  assert.doesNotMatch(sql, /UPDATE\s+(?!app_config\b)\w+/i)
  assert.doesNotMatch(sql, /SET\s+(?:status|enabled)\s*=/i)
  assert.doesNotMatch(sql, /JSON_SET\([\s\S]*?\.content['"]/i)
})

test('append-by-copyKey contract preserves disabled/custom rows and is idempotent', () => {
  // This exercises the intended merge contract; SQL syntax/execution still needs a MySQL check.
  const defaults = jsonRows(migrationSql())
  assert.equal(defaults.length, Object.keys(expectedCopy).length)
  const customized = { copyKey: 'education_school_invalid', content: '运营自定义提示', enabled: false }
  const unrelated = { copyKey: 'other_feature', content: '其他内容', enabled: false }
  const old = { rows: [customized, unrelated], extra: { preserved: true } }
  const append = config => ({ ...config, rows: [...config.rows,
    ...defaults.filter(row => !config.rows.some(existing => existing.copyKey === row.copyKey))] })
  const merged = append(old)
  assert.deepEqual(merged.rows.slice(0, 2), old.rows)
  assert.deepEqual(old.rows, [customized, unrelated])
  assert.deepEqual(merged.extra, old.extra)
  assert.deepEqual(append(merged), merged)
})
