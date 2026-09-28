const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const source = relative => fs.readFileSync(path.join(root, relative), 'utf8')

test('爱听的歌曲仅保留名称输入与保存，不再调用歌曲搜索', () => {
  const page = source('src/pages/profile-edit/songs.tsx')
  const api = source('src/services/prd01.ts')

  assert.doesNotMatch(page, /searchSongs\s*\(/)
  assert.doesNotMatch(page, /songs\.map\s*\(/)
  assert.match(page, /maxlength=\{100\}/)
  assert.match(page, /saveFavoriteSong\(\{\s*songName:/)
  assert.match(api, /saveFavoriteSong:\s*\(data:\s*\{\s*songName:\s*string\s*\}\)/)
})

test('学校必须从现有联想结果中选择后才能保存', () => {
  const schoolInput = source('src/components/SchoolSearchInput.tsx')
  const basicInfo = source('src/pages/verification/components/BasicInfoCard.tsx')
  const education = source('src/pages/verification/components/EducationSubmitPage.tsx')

  assert.match(schoolInput, /onChange\(event\.detail\.value, undefined\)/)
  assert.match(basicInfo, /请从搜索结果中选择学校/)
  assert.match(basicInfo, /if \(!draftCode\)/)
  assert.match(education, /schoolName\.trim\(\) && schoolCode && educationLevel/)
})
