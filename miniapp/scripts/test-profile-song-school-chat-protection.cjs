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
