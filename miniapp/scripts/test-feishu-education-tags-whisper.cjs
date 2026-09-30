const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

function loadModule(relative) {
  const source = read(relative)
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const loaded = { exports: {} }
  Function('module', 'exports', output)(loaded, loaded.exports)
  return loaded.exports
}

test('学历材料上传失败展示可读提示且已上传图片立即计入材料数量', () => {
  const page = read('src/pages/verification/components/EducationSubmitPage.tsx')
  assert.match(page, /resolveCommunityImageUploadError\(error\)/)
  assert.doesNotMatch(page, /String\(error\)/)
  assert.match(page, /setMaterialPreviewUrls\(current => \[\.\.\.current, filePath\]/)
  assert.match(page, /setMaterialUrls\(current => \[\.\.\.current, item\.url\]/)
  assert.doesNotMatch(page, /await resolveProtectedFilePreview\(item\.url\)/)
})

test('同名不同编码标签只展示和保存一次，旧编码按首个同名编码归一', () => {
  const { uniqueProfileTagOptions, normalizeProfileTagCodes } =
    loadModule('src/domain/profileTagSelection.ts')
  const options = [
    { code: 'DETAIL_CONTROL', label: '细节控' },
    { code: 'LEGACY_DETAIL', label: ' 细节控 ' },
    { code: 'RUNNING', label: '跑步' },
  ]
  assert.deepEqual(uniqueProfileTagOptions(options).map(item => item.code), ['DETAIL_CONTROL', 'RUNNING'])
  assert.deepEqual(normalizeProfileTagCodes(['LEGACY_DETAIL', 'DETAIL_CONTROL', 'RUNNING'], options),
    ['DETAIL_CONTROL', 'RUNNING'])
  assert.deepEqual(normalizeProfileTagCodes(['UNKNOWN', 'LEGACY_DETAIL'], options), ['DETAIL_CONTROL'])

  const page = read('src/pages/profile-edit/tags.tsx')
  assert.match(page, /uniqueProfileTagOptions\(groups\.flatMap/)
  assert.match(page, /normalizeProfileTagCodes\(\s*parseTagCodes\(await prd01Api\.getTags\(\)\)/)
  assert.match(page, /uniqueProfileTagOptions\(groups\.find/)
})

test('旧悄悄话详情的会员免费次数与服务端报价一致', () => {
  const { resolveWhisperMemberTip } = loadModule('src/domain/whisperRuntime.ts')
  assert.equal(resolveWhisperMemberTip(3), '开通时空邂逅会员每天免费申请3次')
  assert.equal(resolveWhisperMemberTip(1), '开通时空邂逅会员每天免费申请1次')
  assert.equal(resolveWhisperMemberTip(0), '开通时空邂逅会员享受更多权益')
  const page = read('src/pages/message/whisper-detail.tsx')
  assert.match(page, /freeWhisperDailyQuota=\{quote\?\.freeWhisperDailyQuota\}/)
  assert.match(page, /resolveWhisperMemberTip\(freeWhisperDailyQuota\)/)
  assert.doesNotMatch(page, /每天免费申请一次/)
})
