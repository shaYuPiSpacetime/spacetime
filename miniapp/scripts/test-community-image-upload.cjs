/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const miniappRoot = path.resolve(__dirname, '..')
const repositoryRoot = path.resolve(miniappRoot, '..')

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

const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function resolveMiniappAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolveFilename.call(
      this,
      path.join(miniappRoot, 'src', request.slice(2)),
      parent,
      isMain,
      options,
    )
  }
  return originalResolveFilename.call(this, request, parent, isMain, options)
}

function requirePreparation() {
  const file = path.join(miniappRoot, 'src/domain/communityImageUpload.ts')
  assert.ok(fs.existsSync(file), '社区图片上传预处理器尚不存在')
  return require(file)
}

function createAdapter(sizes, compressedPaths = []) {
  const calls = []
  return {
    calls,
    adapter: {
      getFileSize: async filePath => sizes[filePath] || 0,
      compress: async options => {
        calls.push(options)
        const next = compressedPaths[calls.length - 1]
        if (!next) throw new Error('compressImage:fail')
        return next
      },
    },
  }
}

test('普通 JPG 直接上传，超过顺畅阈值的照片先压缩到 3MB 内', async () => {
  const {
    COMMUNITY_IMAGE_MAX_BYTES,
    COMMUNITY_IMAGE_TARGET_BYTES,
    prepareCommunityImageForUpload,
  } = requirePreparation()
  assert.equal(COMMUNITY_IMAGE_MAX_BYTES, 10 * 1024 * 1024)
  assert.equal(COMMUNITY_IMAGE_TARGET_BYTES, 3 * 1024 * 1024)

  const direct = createAdapter({ 'wxfile://photo.jpg': 1024 * 1024 })
  assert.deepEqual(
    await prepareCommunityImageForUpload('wxfile://photo.jpg', direct.adapter),
    {
      filePath: 'wxfile://photo.jpg',
      fileName: 'photo.jpg',
      fileSizeBytes: 1024 * 1024,
      compressed: false,
    },
  )
  assert.equal(direct.calls.length, 0)

  const compressed = createAdapter(
    {
      'wxfile://large.jpg': 5 * 1024 * 1024,
      'wxfile://large-compressed.jpg': 2 * 1024 * 1024,
    },
    ['wxfile://large-compressed.jpg'],
  )
  const result = await prepareCommunityImageForUpload('wxfile://large.jpg', compressed.adapter)
  assert.equal(result.filePath, 'wxfile://large-compressed.jpg')
  assert.equal(result.fileSizeBytes, 2 * 1024 * 1024)
  assert.equal(result.compressed, true)
  assert.equal(compressed.calls[0].quality, 82)
  assert.equal(compressed.calls[0].compressedWidth, 2400)
})

test('HEIC 和无扩展名临时路径必须经过微信图片转换并使用 jpg 票据文件名', async () => {
  const { prepareCommunityImageForUpload } = requirePreparation()

  for (const original of ['wxfile://photo.heic', 'wxfile://tmp_without_extension']) {
    const fixture = createAdapter(
      {
        [original]: 1024 * 1024,
        'wxfile://normalized-image': 700 * 1024,
      },
      ['wxfile://normalized-image'],
    )
    const result = await prepareCommunityImageForUpload(original, fixture.adapter)
    assert.equal(result.filePath, 'wxfile://normalized-image')
    assert.match(result.fileName, /\.jpg$/)
    assert.equal(result.compressed, true)
  }
})

test('首次压缩仍偏大时继续降档，压缩失败但原图在 10MB 内可回退直传', async () => {
  const { prepareCommunityImageForUpload } = requirePreparation()

  const progressive = createAdapter(
    {
      'wxfile://large.jpg': 12 * 1024 * 1024,
      'wxfile://quality-82.jpg': 6 * 1024 * 1024,
      'wxfile://quality-70.jpg': 2 * 1024 * 1024,
    },
    ['wxfile://quality-82.jpg', 'wxfile://quality-70.jpg'],
  )
  const compressed = await prepareCommunityImageForUpload('wxfile://large.jpg', progressive.adapter)
  assert.equal(compressed.filePath, 'wxfile://quality-70.jpg')
  assert.equal(progressive.calls.length, 2)

  const fallback = createAdapter({ 'wxfile://photo.png': 4 * 1024 * 1024 })
  const original = await prepareCommunityImageForUpload('wxfile://photo.png', fallback.adapter)
  assert.equal(original.filePath, 'wxfile://photo.png')
  assert.equal(original.compressed, false)
})

test('超限和接口错误转换为发布动态可理解提示', async () => {
  const { prepareCommunityImageForUpload, resolveCommunityImageUploadError } = requirePreparation()

  const oversized = createAdapter(
    {
      'wxfile://huge.jpg': 20 * 1024 * 1024,
      'wxfile://still-huge.jpg': 12 * 1024 * 1024,
    },
    ['wxfile://still-huge.jpg'],
  )
  await assert.rejects(
    prepareCommunityImageForUpload('wxfile://huge.jpg', oversized.adapter),
    /图片过大/,
  )
  assert.equal(resolveCommunityImageUploadError(new Error('403')), '图片上传鉴权失败，请稍后重试')
  assert.equal(
    resolveCommunityImageUploadError(new Error('文件大小不能超过10MB')),
    '文件大小不能超过10MB',
  )
  assert.equal(
    resolveCommunityImageUploadError({ errMsg: 'uploadFile:fail timeout' }),
    '网络不稳定，图片上传失败',
  )
})

test('发布动态消费预处理结果、展示真实失败原因且不提供重新上传', () => {
  const uploadService = fs.readFileSync(path.join(miniappRoot, 'src/services/ossUpload.ts'), 'utf8')
  const prd01Service = fs.readFileSync(path.join(miniappRoot, 'src/services/prd01.ts'), 'utf8')
  const compose = fs.readFileSync(path.join(miniappRoot, 'src/pages/qianxun/compose.tsx'), 'utf8')

  assert.match(uploadService, /prepareCommunityImageForUpload/)
  assert.match(uploadService, /Taro\.compressImage/)
  assert.match(uploadService, /export async function uploadCommunityImageDirectToOss/)
  assert.match(prd01Service, /uploadAlbum:[\s\S]{0,160}uploadCommunityImageDirectToOss/)
  assert.match(compose, /resolveCommunityImageUploadError/)
  assert.match(compose, /item\.failureMessage/)
  assert.doesNotMatch(compose, /COMMUNITY_COPY_KEYS\.uploadRetry/)
})

test('生产 SQL 将相册上限恢复为 10MB，且只定点修改 album 规则', () => {
  const sqlFile = path.join(repositoryRoot, 'deploy/sql/prod/068_prd01_album_upload_limit_10mb.sql')
  assert.ok(fs.existsSync(sqlFile), '缺少生产相册 10MB 配置修复 SQL')
  const sql = fs.readFileSync(sqlFile, 'utf8')
  assert.match(sql, /rule_key\s*=\s*'album'/)
  assert.match(sql, /\.maxMb/)
  assert.match(sql, /'10'/)
  assert.doesNotMatch(sql, /UPDATE\s+app_config[\s\S]*config_value\s*=\s*'\{"rows"/i)
})
