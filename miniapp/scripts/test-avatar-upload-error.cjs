/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
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

const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function resolveMiniappAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolveFilename.call(
      this,
      path.join(miniappRoot, 'src', request.slice(2)),
      parent,
      isMain,
      options
    )
  }
  return originalResolveFilename.call(this, request, parent, isMain, options)
}

function requireAvatarUploadError() {
  const file = path.join(miniappRoot, 'src/domain/avatarUploadError.ts')
  assert.ok(fs.existsSync(file), '头像上传错误解析器尚不存在')
  return require(file)
}

test('微信原生错误转换为头像流程可读提示', () => {
  const { resolveAvatarUploadError } = requireAvatarUploadError()

  assert.equal(
    resolveAvatarUploadError({ errMsg: 'uploadFile:fail url not in domain list' }),
    '头像上传域名未配置，请联系管理员'
  )
  assert.equal(
    resolveAvatarUploadError({ errMsg: 'canvasToTempFilePath:fail create bitmap failed' }),
    '头像裁剪失败，请重新选择图片'
  )
  assert.equal(
    resolveAvatarUploadError({ errMsg: 'uploadFile:fail timeout' }),
    '头像上传失败，请检查网络后重试'
  )
})

test('接口错误保留业务提示，未知对象不再展示 object Object', () => {
  const { resolveAvatarUploadError } = requireAvatarUploadError()

  assert.equal(
    resolveAvatarUploadError({ data: { msg: '文件格式不支持，请重新选择图片' } }),
    '文件格式不支持，请重新选择图片'
  )
  assert.equal(resolveAvatarUploadError({}), '头像处理失败，请稍后重试')
  assert.notEqual(resolveAvatarUploadError({}), '[object Object]')
})

test('头像裁剪页统一使用头像错误解析器', () => {
  const source = fs.readFileSync(
    path.join(miniappRoot, 'src/pages/verification/avatar-crop.tsx'),
    'utf8'
  )

  assert.match(source, /resolveAvatarUploadError/)
  assert.doesNotMatch(source, /String\(error\)/)
})
