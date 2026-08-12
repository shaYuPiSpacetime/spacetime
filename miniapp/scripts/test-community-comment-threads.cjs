/* eslint-env node */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const miniappRoot = path.resolve(__dirname, '..')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  })
  module._compile(output.outputText, filename)
}

function requireThreads() {
  const filename = path.join(miniappRoot, 'src/domain/communityCommentThreads.ts')
  assert.ok(fs.existsSync(filename), '缺少评论线程领域函数')
  delete require.cache[filename]
  return require(filename)
}

const comment = (id, parentCommentId, authorId, createTime) => ({
  id,
  parentCommentId,
  authorId,
  authorName: `用户${authorId}`,
  authorAvatar: '',
  postId: 1,
  content: `评论${id}`,
  status: 'published',
  createTime,
})

test('同一父评论的多条回复固定归入一个下一层级', () => {
  const { buildCommunityCommentThreads } = requireThreads()
  const rows = [
    comment(1, undefined, 10, '2026-08-12 10:00:00'),
    comment(2, 1, 20, '2026-08-12 10:01:00'),
    comment(3, 2, 20, '2026-08-12 10:02:00'),
  ]

  const threads = buildCommunityCommentThreads(rows, 'earliest')
  assert.equal(threads.length, 1)
  assert.equal(threads[0].root.id, 1)
  assert.deepEqual(threads[0].replies.map(item => item.id), [2, 3])
})

test('回复子评论时提交一级线程 ID，且最新排序只重排线程不拆散回复', () => {
  const { buildCommunityCommentThreads, resolveCommentThreadRootId } = requireThreads()
  const rows = [
    comment(1, undefined, 10, '2026-08-12 10:00:00'),
    comment(2, 1, 20, '2026-08-12 10:01:00'),
    comment(4, undefined, 30, '2026-08-12 11:00:00'),
  ]

  assert.equal(resolveCommentThreadRootId(rows, 2), 1)
  assert.deepEqual(buildCommunityCommentThreads(rows, 'latest').map(item => item.root.id), [4, 1])
})
