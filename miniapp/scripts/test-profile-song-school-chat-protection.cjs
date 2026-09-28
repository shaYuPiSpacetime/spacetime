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

test('私信使用本人真实头像，并在保护期内按女方回复即时锁定和解锁', () => {
  const chat = source('src/pages/message/private-chat.tsx')
  const types = source('src/types/message.ts')
  const runtime = source('src/domain/messageRuntime.ts')

  assert.match(types, /selfAvatarUrl:\s*string \| null/)
  assert.match(types, /appliesToCurrentUser:\s*boolean/)
  assert.match(types, /waitingForFemaleReply:\s*boolean/)
  assert.match(chat, /detail\?\.selfAvatarUrl \|\| MESSAGE_AVATAR/)
  assert.match(chat, /item\.direction === 'incoming'/)
  assert.match(chat, /waitingForFemaleReply:\s*false/)
  assert.match(chat, /sendBlockedReason:\s*'female_reply_pending'/)
  assert.match(chat, /waitingForFemaleReply:\s*true/)
  assert.match(runtime, /female_reply_pending/)
  assert.match(runtime, /等待女方回复后可继续发送/)
})

test('管理端准确说明女性保护为一发一回', () => {
  const page = fs.readFileSync(path.resolve(root, '..', 'frontend/src/pages/message/MessageConfigPage.tsx'), 'utf8')

  assert.match(page, /保护期内男方每发送一条消息后，需等待女方回复才能继续发送/)
  assert.doesNotMatch(page, /限制男方先发/)
})
