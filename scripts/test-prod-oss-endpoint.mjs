import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const resolver = path.join(root, 'deploy/scripts/resolve-oss-endpoint.sh')

function normalizeOssConfig(bucket, endpoint) {
  const result = spawnSync(
    'bash',
    [
      '-c',
      'source "$1" && OSS_BUCKET_NAME="$2" OSS_ENDPOINT="$3" && normalize_oss_config && printf "%s|%s" "$OSS_BUCKET_NAME" "$OSS_ENDPOINT"',
      'bash',
      resolver,
      bucket,
      endpoint,
    ],
    { encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr || `OSS Endpoint 解析失败：${bucket}`)
  return result.stdout.trim()
}

assert.equal(
  normalizeOssConfig('spacetime', 'https://oss-cn-shanghai.aliyuncs.com'),
  'shikongxiehou|https://oss-cn-shanghai.aliyuncs.com',
  '旧 spacetime Bucket 必须迁移到当前 shikongxiehou 上海存储',
)
assert.equal(
  normalizeOssConfig('shikongxiehou', 'https://oss-cn-hangzhou.aliyuncs.com'),
  'shikongxiehou|https://oss-cn-shanghai.aliyuncs.com',
  '当前 shikongxiehou Bucket 必须自动切换到上海 Endpoint',
)
assert.equal(
  normalizeOssConfig('custom-bucket', 'https://oss-cn-beijing.aliyuncs.com'),
  'custom-bucket|https://oss-cn-beijing.aliyuncs.com',
  '未知 Bucket 必须保留显式配置，不能擅自改写',
)

console.log('生产 OSS Bucket 与 Endpoint 地域校正测试通过：3/3')
