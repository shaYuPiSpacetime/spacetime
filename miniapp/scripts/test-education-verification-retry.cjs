/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

let rules
function loadRules() {
  if (rules) return rules
  const file = path.resolve(__dirname, '../src/domain/educationVerification.ts')
  assert.ok(fs.existsSync(file), '学历重填纯规则尚不存在')
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: name => { throw new Error(`纯规则不应加载运行时依赖：${name}`) },
  }, { filename: file })
  rules = module.exports
  return rules
}

const codes = values => values.map(code => ({ code, label: code }))
const options = {
  educationUserType: codes(['STUDENT', 'MAINLAND_GRADUATE', 'OVERSEAS']),
  educationMethod: codes(['STUDENT_CARD', 'CHSI', 'DIPLOMA_NO', 'MATERIAL_UPLOAD']),
  educationLevel: codes(['BACHELOR', 'MASTER']),
}
const draft = patch => ({
  educationUserType: 'MAINLAND_GRADUATE',
  schoolName: '示例大学',
  schoolCode: 'SCHOOL_001',
  educationLevel: 'BACHELOR',
  chsiCode: 'Ab1234567890',
  diplomaNo: 'DIPLOMA_001',
  certificateName: '示例姓名',
  materialUrls: ['credential/one'],
  educationAgreementChecked: true,
  ...patch,
})
const plain = value => JSON.parse(JSON.stringify(value))
const validate = (method, patch = {}, dictionary = options, maxCount = 4) =>
  plain(loadRules().validateEducationDraft(method, draft(patch), dictionary, maxCount))
const issue = (field, copyKey) => ({ field, copyKey })

test('E01 只有学校名的历史驳回记录要求重新点选学校', () => {
  assert.deepEqual(validate('CHSI', { schoolCode: '  ' }), [
    issue('school', 'education_school_selection_required'),
  ])
})

for (const name of ['', ' ', '一', '学'.repeat(101)]) {
  test(`E01 学校名称长度非法（${name.trim().length}）定位学校字段`, () => {
    assert.deepEqual(validate('CHSI', { schoolName: name }), [
      issue('school', 'education_school_invalid'),
    ])
  })
}
test('E01 学校trim后2/100字符且编码非空通过', () => {
  for (const size of [2, 100]) {
    assert.deepEqual(validate('CHSI', { schoolName: `  ${'学'.repeat(size)}  `, schoolCode: ' SCHOOL_001 ' }), [])
  }
})

for (const code of ['12345', '12345678901', '1'.repeat(19), '1234567890_2', '']) {
  test(`E04 非法CHSI码 ${JSON.stringify(code)} 定位验证码字段`, () => {
    assert.deepEqual(validate('CHSI', { chsiCode: code }), [issue('chsiCode', 'education_chsi_invalid')])
  })
}
test('E04 CHSI trim后12/18位字母数字通过', () => {
  for (const code of [' Ab1234567890 ', `a${'1'.repeat(17)}`]) {
    assert.deepEqual(validate('CHSI', { chsiCode: code }), [])
  }
})
test('E05 CHSI缺失或停用学历必须补齐启用选项', () => {
  for (const educationLevel of ['', 'DISABLED', 'bachelor']) {
    assert.deepEqual(validate('CHSI', { educationLevel }), [issue('educationLevel', 'education_level_required')])
  }
})

for (const diplomaNo of ['', ' ', '1'.repeat(65)]) {
  test(`E06 证书编号为空或过长（${diplomaNo.trim().length}）`, () => {
    assert.deepEqual(validate('DIPLOMA_NO', { diplomaNo }), [issue('diplomaNo', 'education_diploma_invalid')])
  })
}
for (const certificateName of ['', ' ', '名'.repeat(51)]) {
  test(`E06 证书姓名为空或过长（${certificateName.trim().length}）`, () => {
    assert.deepEqual(validate('DIPLOMA_NO', { certificateName }), [
      issue('certificateName', 'education_certificate_name_invalid'),
    ])
  })
}
test('E06 编号64字符和姓名50字符的trim边界通过', () => {
  assert.deepEqual(validate('DIPLOMA_NO', { diplomaNo: ` ${'1'.repeat(64)} `, certificateName: ` ${'名'.repeat(50)} ` }), [])
})
test('E07 学生/毕业生上传至少一张且不能超过动态上限', () => {
  for (const [method, educationUserType] of [['STUDENT_CARD', 'STUDENT'], ['MATERIAL_UPLOAD', 'MAINLAND_GRADUATE']]) {
    assert.deepEqual(validate(method, { educationUserType, materialUrls: [] }), [issue('materials', 'education_material_required')])
    assert.deepEqual(validate(method, { educationUserType, materialUrls: ['a', 'b', 'c'] }, options, 2), [issue('materials', 'education_material_limit_invalid')])
    assert.deepEqual(validate(method, { educationUserType, materialUrls: ['a', 'b'] }, options, 2), [])
  }
})
test('E07 配置上限6时5张材料仍被全局4张上限拒绝', () => {
  for (const [method, educationUserType] of [['STUDENT_CARD', 'STUDENT'], ['MATERIAL_UPLOAD', 'MAINLAND_GRADUATE']]) {
    assert.deepEqual(validate(method, { educationUserType, materialUrls: ['a', 'b', 'c', 'd', 'e'] }, options, 6), [
      issue('materials', 'education_material_limit_invalid'),
    ])
    assert.deepEqual(validate(method, { educationUserType, materialUrls: ['a', 'b', 'c', 'd'] }, options, 6), [])
  }
})
test('E07 非法或非正数材料上限使用默认4张', () => {
  for (const maxCount of [NaN, Infinity, -Infinity, 0, -1]) {
    assert.deepEqual(validate('MATERIAL_UPLOAD', { materialUrls: ['a', 'b', 'c', 'd'] }, options, maxCount), [])
    assert.deepEqual(validate('MATERIAL_UPLOAD', { materialUrls: ['a', 'b', 'c', 'd', 'e'] }, options, maxCount), [
      issue('materials', 'education_material_limit_invalid'),
    ])
  }
})
test('E09 未勾选协议返回协议字段错误', () => {
  assert.deepEqual(validate('CHSI', { educationAgreementChecked: false }), [issue('agreement', 'education_agreement_required')])
})
test('E14 字典未加载、方式停用、人群停用或不受支持时禁止方式', () => {
  const cases = [
    [undefined, {}],
    [{ ...options, educationMethod: [] }, {}],
    [{ ...options, educationUserType: [] }, {}],
    [options, { educationUserType: 'OVERSEAS' }],
    [options, { educationUserType: 'STUDENT' }],
    [options, { educationUserType: 'mainland_graduate' }],
  ]
  for (const [dictionary, patch] of cases) {
    const errors = plain(loadRules().validateEducationDraft('CHSI', draft(patch), dictionary, 4))
    assert.equal(errors[0].field, 'method')
    assert.equal(errors[0].copyKey, 'education_method_unavailable')
  }
  assert.equal(validate('STUDENT_CARD')[0].copyKey, 'education_method_unavailable')
})
test('E14 支持的学生及大陆毕业生各方式通过，忽略其他方式的残留字段', () => {
  assert.deepEqual(validate('STUDENT_CARD', { educationUserType: 'STUDENT', chsiCode: '', diplomaNo: '', certificateName: '' }), [])
  assert.deepEqual(validate('MATERIAL_UPLOAD', { certificateName: '', diplomaNo: '', chsiCode: '' }), [])
  assert.deepEqual(validate('CHSI', { diplomaNo: '', certificateName: '', materialUrls: [] }), [])
  assert.deepEqual(validate('DIPLOMA_NO', { chsiCode: '', materialUrls: [] }), [])
})
test('字段错误依次为方式、学校、学历、当前方式字段、协议', () => {
  assert.deepEqual(validate('DIPLOMA_NO', {
    educationUserType: 'STUDENT', schoolName: '', schoolCode: '', educationLevel: '',
    diplomaNo: '', certificateName: '', educationAgreementChecked: false,
  }), [
    issue('method', 'education_method_unavailable'),
    issue('school', 'education_school_invalid'),
    issue('educationLevel', 'education_level_required'),
    issue('diplomaNo', 'education_diploma_invalid'),
    issue('certificateName', 'education_certificate_name_invalid'),
    issue('agreement', 'education_agreement_required'),
  ])
})
test('E14 未知资格和false资格均不默认放行', () => {
  const { isEducationSubmissionAllowed } = loadRules()
  for (const detail of [undefined, {}, { canSubmit: false }, { canSubmit: 'true' }, { auditStatus: 'REJECTED' }]) {
    assert.equal(isEducationSubmissionAllowed(detail), false)
  }
})
test('E12 待审核/审核中即使canSubmit为true也不放行', () => {
  const { isEducationSubmissionAllowed } = loadRules()
  for (const auditStatus of ['PENDING', 'REVIEWING']) {
    assert.equal(isEducationSubmissionAllowed({ canSubmit: true, auditStatus }), false)
  }
})
test('E16 通过/驳回/过期以及无审核状态按服务端明确资格放行', () => {
  const { isEducationSubmissionAllowed } = loadRules()
  for (const auditStatus of ['APPROVED', 'REJECTED', 'EXPIRED', undefined]) {
    assert.equal(isEducationSubmissionAllowed({ canSubmit: true, auditStatus }), true)
    assert.equal(isEducationSubmissionAllowed({ canSubmit: false, auditStatus }), false)
  }
})
test('E16 只有驳回/过期使用重新提交文案', () => {
  const { educationSubmitActionKey } = loadRules()
  for (const auditStatus of ['REJECTED', 'EXPIRED']) {
    assert.equal(educationSubmitActionKey({ canSubmit: true, auditStatus }), 'education_resubmit_action')
  }
  for (const detail of [undefined, { auditStatus: 'APPROVED' }, { auditStatus: 'PENDING' }, {}]) {
    assert.equal(educationSubmitActionKey(detail), 'common_submit_action')
  }
})
test('E16 无记录创建空白草稿，始终使用当前路由人群并重置协议', () => {
  const result = plain(loadRules().createEducationDraft(undefined, 'CHSI', 'MAINLAND_GRADUATE'))
  assert.deepEqual(result, {
    educationUserType: 'MAINLAND_GRADUATE', schoolName: '', schoolCode: '', educationLevel: '',
    chsiCode: '', diplomaNo: '', certificateName: '', materialUrls: [], educationAgreementChecked: false,
  })
})
test('E16 同方式回填全部专属字段并clone历史材料，不截掉上限外条目', () => {
  const materials = Object.freeze(['a', 'b', 'c', 'd', 'e'])
  const detail = Object.freeze({ ...draft({ materialUrls: materials }), educationMethod: 'MATERIAL_UPLOAD', canSubmit: true })
  const result = loadRules().createEducationDraft(detail, 'MATERIAL_UPLOAD', 'STUDENT')
  assert.equal(result.educationUserType, 'STUDENT')
  assert.equal(result.schoolName, detail.schoolName)
  assert.equal(result.schoolCode, detail.schoolCode)
  assert.equal(result.educationLevel, detail.educationLevel)
  assert.equal(result.chsiCode, detail.chsiCode)
  assert.equal(result.diplomaNo, detail.diplomaNo)
  assert.equal(result.certificateName, detail.certificateName)
  assert.equal(result.educationAgreementChecked, false)
  assert.notEqual(result.materialUrls, detail.materialUrls)
  assert.deepEqual(plain(result.materialUrls), ['a', 'b', 'c', 'd', 'e'])
  result.materialUrls.pop()
  assert.equal(detail.materialUrls.length, 5)
})
test('E16 切换任意方式只回填公共字段，不串用历史专属字段', () => {
  const { createEducationDraft } = loadRules()
  const methods = ['STUDENT_CARD', 'CHSI', 'DIPLOMA_NO', 'MATERIAL_UPLOAD']
  for (const previous of methods) {
    for (const current of methods.filter(value => value !== previous)) {
      const detail = { ...draft(), educationMethod: previous, canSubmit: true }
      const result = createEducationDraft(detail, current, 'MAINLAND_GRADUATE')
      assert.equal(result.schoolName, detail.schoolName)
      assert.equal(result.schoolCode, detail.schoolCode)
      assert.equal(result.educationLevel, detail.educationLevel)
      assert.equal(result.chsiCode, '')
      assert.equal(result.diplomaNo, '')
      assert.equal(result.certificateName, '')
      assert.deepEqual(plain(result.materialUrls), [])
      assert.equal(result.educationAgreementChecked, false)
    }
  }
})
