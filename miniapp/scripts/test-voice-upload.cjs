const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')

function loadModule(relativePath, dependencies = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const loaded = { exports: {} }
  Function('module', 'exports', 'require', output)(loaded, loaded.exports, name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name]
    if (name.startsWith('@/')) return loadModule(`src/${name.slice(2)}.ts`)
    return require(name)
  })
  return loaded.exports
}

function createUpload(headerBytes, options = {}) {
  const calls = { tickets: [], uploads: [], reads: [] }
  const header = Uint8Array.from(headerBytes).buffer
  const upload = loadModule('src/services/ossUpload.ts', {
    '@tarojs/taro': {
      getFileInfo: async () => ({ size: options.size ?? 4096 }),
      getFileSystemManager: () => ({
        readFile: args => {
          calls.reads.push(args)
          if (options.readError) args.fail({ errMsg: 'readFile:fail' })
          else args.success({ data: header })
        },
      }),
      uploadFile: async args => {
        calls.uploads.push(args)
        return { statusCode: 204 }
      },
    },
    './request': {
      post: async (url, body) => {
        calls.tickets.push({ url, ...body })
        const extension = body.fileName.split('.').pop()
        if (!(options.formats || ['mp3', 'aac', 'm4a']).includes(extension)) {
          throw new Error('文件格式不支持，请按页面上传要求重新选择')
        }
        return { uploadUrl: 'https://oss.example', fileUrl: `https://cdn.example/${body.fileName}`, key: body.fileName, formData: { key: body.fileName }, protectedFile: false }
      },
    },
  })
  const { prd01Api } = loadModule('src/services/prd01.ts', {
    './ossUpload': upload,
    './request': {},
  })
  return { calls, upload: prd01Api.uploadVoice }
}

test('电脑端无后缀的 MP3 录音按真实格式申请票据，上传仍使用原临时路径', async () => {
  const { upload, calls } = createUpload([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0])
  const originalPath = 'wxfile://tmp/recording_1730000000'
  const result = await upload(originalPath)
  assert.equal(calls.tickets[0].fileName, 'voice-intro.mp3')
  assert.equal(calls.tickets[0].fileSizeBytes, 4096)
  assert.equal(calls.uploads[0].filePath, originalPath)
  assert.equal(result.url, 'https://cdn.example/voice-intro.mp3')
  assert.equal(calls.reads[0].length, 64)
})

test('带临时后缀的无 ID3 MP3 和手机 MP3 均能上传', async () => {
  for (const filePath of ['http://tmp/recording.tmp', 'wxfile://recording.mp3', 'C:\\Temp\\recording']) {
    const { upload, calls } = createUpload([0xff, 0xfb, 0x90, 0x64])
    await upload(filePath)
    assert.equal(calls.tickets[0].fileName, 'voice-intro.mp3')
    assert.equal(calls.uploads[0].filePath, filePath)
  }
})

test('AAC 和 M4A 使用各自格式，不能伪装成 MP3', async () => {
  const fixtures = [
    { bytes: [0xff, 0xf1, 0x50, 0x80, 0x01, 0x1f, 0xfc], extension: 'aac' },
    { bytes: [0, 0, 0, 20, ...Buffer.from('ftypM4A ')], extension: 'm4a' },
  ]
  for (const fixture of fixtures) {
    const { upload, calls } = createUpload(fixture.bytes)
    await upload('wxfile://recording.mp3')
    assert.equal(calls.tickets[0].fileName, `voice-intro.${fixture.extension}`)
  }
})

test('真实 WAV 仍服从后台格式配置，禁止改成 MP3 绕过校验', async () => {
  const header = [...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WAVE')]
  const denied = createUpload(header, { formats: ['mp3'] })
  await assert.rejects(denied.upload('wxfile://recording.mp3'), /文件格式不支持/)
  assert.equal(denied.calls.tickets[0].fileName, 'voice-intro.wav')
  assert.equal(denied.calls.uploads.length, 0)
  const allowed = createUpload(header, { formats: ['wav'] })
  await allowed.upload('wxfile://recording.tmp')
  assert.equal(allowed.calls.tickets[0].fileName, 'voice-intro.wav')
})

test('无效文件、空录音和读取失败不会申请上传票据', async () => {
  for (const [bytes, options, expected] of [
    [[0, 1, 2, 3], {}, /无法识别录音格式/],
    [[0xff, 0xff, 0xff, 0xff], {}, /无法识别录音格式/],
    [[0x49, 0x44, 0x33], {}, /无法识别录音格式/],
    [[], { size: 0 }, /录音文件为空/],
    [[], { readError: true }, /读取录音失败/],
  ]) {
    const { upload, calls } = createUpload(bytes, options)
    await assert.rejects(upload('wxfile://recording.mp3'), expected)
    assert.equal(calls.tickets.length, 0)
    assert.equal(calls.uploads.length, 0)
  }
})
