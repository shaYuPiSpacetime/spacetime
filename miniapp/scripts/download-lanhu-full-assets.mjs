import fs from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(rootDir, '..')
const cookiePath = process.env.LANHU_COOKIE_FILE || path.join(process.env.HOME || '', '.codex/credentials/lanhu.cookie')
const refDir = path.join(rootDir, '.lanhu-ref/lanhu-full-2026-07-07')
const imageDir = path.join(refDir, 'images')
const projectId = 'd9c9e50f-fee5-47ca-bd6b-ae05c0d5332b'
const teamId = '428e8368-c279-4369-947b-a5828487924d'

function slugify(input) {
  return input
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function inferExt(url) {
  const pathname = new URL(url).pathname.toLowerCase()
  if (pathname.includes('webp_') || pathname.endsWith('.webp')) return 'webp'
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') || pathname.includes('jpeg_')) return 'jpg'
  return 'png'
}

function parseLayoutData(rawLayoutData) {
  if (!rawLayoutData || typeof rawLayoutData !== 'string') return {}
  try {
    return JSON.parse(rawLayoutData)
  } catch {
    return {}
  }
}

function pickDownloadUrl(image) {
  const layoutData = parseLayoutData(image.layout_data)
  const compressInfo = layoutData.compress_info || {}
  return (
    compressInfo.webp750 ||
    compressInfo.webp375 ||
    compressInfo.webp1500 ||
    compressInfo.jpeg750 ||
    compressInfo.jpeg375 ||
    image.url
  )
}

function requestBuffer(url, headers = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const target = typeof url === 'string' ? new URL(url) : url
    const client = target.protocol === 'http:' ? http : https
    const request = client.request(
      target,
      {
        method: 'GET',
        headers,
      },
      (response) => {
        const statusCode = response.statusCode || 0
        const location = response.headers.location
        if (statusCode >= 300 && statusCode < 400 && location) {
          response.resume()
          if (redirectCount > 5) {
            reject(new Error(`重定向次数过多: ${target.toString()}`))
            return
          }
          resolve(requestBuffer(new URL(location, target), headers, redirectCount + 1))
          return
        }
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          resolve({
            ok: statusCode >= 200 && statusCode < 300,
            status: statusCode,
            body: Buffer.concat(chunks),
          })
        })
      }
    )
    request.on('error', reject)
    request.setTimeout(60_000, () => request.destroy(new Error(`请求超时: ${target.toString()}`)))
    request.end()
  })
}

async function fetchJson(url, cookie) {
  const response = await requestBuffer(url, {
      Accept: 'application/json, text/plain, */*',
      Cookie: cookie,
      Referer: 'https://lanhuapp.com/web/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'request-from': 'web',
      'real-path': '/item/project/product',
    }
  })
  if (!response.ok) {
    throw new Error(`蓝湖接口请求失败: ${response.status} ${url}`)
  }
  const envelope = JSON.parse(response.body.toString('utf8'))
  if (!(envelope.code === 0 || envelope.code === '0' || envelope.code === '00000')) {
    throw new Error(`蓝湖接口返回异常: ${envelope.code} ${envelope.msg || ''}`)
  }
  return envelope.data || envelope.result
}

async function downloadFile(url, filePath, cookie) {
  const response = await requestBuffer(url, {
      Cookie: cookie,
      Referer: 'https://lanhuapp.com/web/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }
  })
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status} ${url}`)
  }
  await fs.writeFile(filePath, response.body)
  return response.body.length
}

async function main() {
  const cookie = await fs.readFile(cookiePath, 'utf8')
  await fs.mkdir(imageDir, { recursive: true })

  const apiUrl = new URL('/api/project/images', 'https://lanhuapp.com')
  apiUrl.searchParams.set('project_id', projectId)
  apiUrl.searchParams.set('team_id', teamId)
  apiUrl.searchParams.set('dds_status', '1')
  apiUrl.searchParams.set('position', '1')
  apiUrl.searchParams.set('show_cb_src', '1')
  apiUrl.searchParams.set('comment', '1')

  const payload = await fetchJson(apiUrl, cookie)
  const images = Array.isArray(payload.images) ? payload.images : []
  const designs = []
  const failures = []

  for (const [index, image] of images.entries()) {
    const designIndex = index + 1
    const sourceUrl = pickDownloadUrl(image)
    if (!sourceUrl) {
      failures.push(`${designIndex}. ${image.name || image.id}: 无可下载 URL`)
      continue
    }
    const ext = inferExt(sourceUrl)
    const fileName = `${String(designIndex).padStart(2, '0')}-${slugify(image.name || image.id)}.${ext}`
    const filePath = path.join(imageDir, fileName)
    try {
      const bytes = await downloadFile(sourceUrl, filePath, cookie)
      designs.push({
        index: designIndex,
        id: image.id,
        name: image.name,
        width: image.width,
        height: image.height,
        sourceUrl,
        localPath: path.relative(rootDir, filePath),
        bytes,
        updateTime: image.update_time,
      })
    } catch (error) {
      failures.push(`${designIndex}. ${image.name || image.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const manifest = {
    projectName: payload.name || '时空邂逅0625',
    projectId,
    teamId,
    downloadedAt: new Date().toISOString(),
    totalDesigns: images.length,
    downloadedDesigns: designs.length,
    failedDesigns: failures.length,
    designs,
  }

  await fs.writeFile(path.join(refDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await fs.writeFile(
    path.join(refDir, 'download-report.md'),
    [
      '# 蓝湖全量 UI 稿下载报告',
      '',
      `- 项目: ${manifest.projectName}`,
      `- 总设计稿: ${images.length}`,
      `- 下载成功: ${designs.length}`,
      `- 下载失败: ${failures.length}`,
      `- 输出目录: ${path.relative(repoRoot, refDir)}`,
      '',
      failures.length ? '## 失败项' : '## 失败项',
      '',
      failures.length ? failures.map((item) => `- ${item}`).join('\n') : '- 无',
      '',
    ].join('\n')
  )
  await fs.writeFile(
    path.join(refDir, 'missing-slices.md'),
    [
      '# 蓝湖缺失切片清单',
      '',
      '- MCP 当前对部分稿只能返回 tokens 或整图参考，未提供可独立复用的 layer/slice 明细。',
      '- 运行时代码不得引用本目录整页图；需要进入运行包的小图必须单独转 WebP 后放入 `miniapp/src/assets/lanhu/`。',
      '',
      '## 本次处理',
      '',
      `- 已下载整页参考图: ${designs.length} 张`,
      '- 可复用运行切片: 以现有 `src/assets/lanhu` 和后续明确导出的局部切图为准。',
      '',
    ].join('\n')
  )

  if (failures.length > 0) {
    throw new Error(`蓝湖参考图下载存在失败项: ${failures.length}`)
  }

  console.log(`蓝湖全量参考图下载完成: ${designs.length}/${images.length}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
