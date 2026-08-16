export const WHISPER_SOURCE_SCENES = [
  'recommendation',
  'profile',
  'community_post',
  'community_comment',
  'whisper_reverse',
] as const

export type WhisperSourceScene = (typeof WHISPER_SOURCE_SCENES)[number]

export interface WhisperPrecheckPayload {
  targetUserNo: string
  sourceScene: WhisperSourceScene
  sourceBizNo?: string
}

export interface WhisperCreatePayload extends WhisperPrecheckPayload {
  content: string
  quoteToken: string
}

export interface WhisperIdempotencyCache {
  get(scope: string, fingerprint: string): string
  clear(): void
}

const USER_NO_PATTERN = /^USR-\d{12}$/
const COMMUNITY_SOURCE_SCENES = new Set<WhisperSourceScene>([
  'community_post',
  'community_comment',
  'whisper_reverse',
])
const RECOMMENDATION_ROUTE_SCENES = new Set(['recommendation', 'fate', 'ideal', 'featured', 'replay'])
const TECHNICAL_FIELD_PATTERN = /sourceScene|sourceBizNo|targetUserNo|来源场景|来源业务编号|目标用户编号/i
const INVALID_ENTRY_MESSAGE = '申请入口信息不完整，请返回后重新进入'
const EXPIRED_ENTRY_MESSAGE = '申请入口信息已失效，请返回后重新进入'

function defaultRequestId(): string {
  return `whisper-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

/** 同一业务对象和正文的失败重试复用请求号，成功或内容变化后再生成新请求号。 */
export function createWhisperIdempotencyCache(
  factory: () => string = defaultRequestId,
): WhisperIdempotencyCache {
  let activeScope = ''
  let activeFingerprint = ''
  let activeRequestId = ''
  return {
    get(scope, fingerprint) {
      if (scope !== activeScope || fingerprint !== activeFingerprint || !activeRequestId) {
        activeScope = scope
        activeFingerprint = fingerprint
        activeRequestId = factory()
      }
      return activeRequestId
    },
    clear() {
      activeScope = ''
      activeFingerprint = ''
      activeRequestId = ''
    },
  }
}

function normalizeSource(input: WhisperPrecheckPayload): WhisperPrecheckPayload {
  const targetUserNo = String(input.targetUserNo || '').trim()
  const sourceScene = String(input.sourceScene || '').trim() as WhisperSourceScene
  const sourceBizNo = String(input.sourceBizNo || '').trim()
  if (!USER_NO_PATTERN.test(targetUserNo) || !WHISPER_SOURCE_SCENES.includes(sourceScene)) {
    throw new Error(INVALID_ENTRY_MESSAGE)
  }
  if (COMMUNITY_SOURCE_SCENES.has(sourceScene) && !sourceBizNo) {
    throw new Error(INVALID_ENTRY_MESSAGE)
  }
  return {
    targetUserNo,
    sourceScene,
    ...(sourceBizNo ? { sourceBizNo } : {}),
  }
}

export function buildWhisperPrecheckPayload(
  input: WhisperPrecheckPayload,
): WhisperPrecheckPayload {
  return normalizeSource(input)
}

export function buildWhisperCreatePayload(input: WhisperCreatePayload): WhisperCreatePayload {
  return {
    ...normalizeSource(input),
    content: input.content,
    quoteToken: input.quoteToken,
  }
}

export function resolveStableWhisperTargetUserNo(
  userNo?: string | null,
  userId?: string | number | null,
): string {
  const stableUserNo = String(userNo || '').trim()
  if (USER_NO_PATTERN.test(stableUserNo)) return stableUserNo
  const numericId = String(userId ?? '').trim()
  if (!/^\d{1,12}$/.test(numericId) || Number(numericId) <= 0) return ''
  return `USR-${numericId.padStart(12, '0')}`
}

export function resolveWhisperRouteSourceScene(sourceScene?: string): WhisperSourceScene {
  const normalized = String(sourceScene || '').trim().toLowerCase()
  if (WHISPER_SOURCE_SCENES.includes(normalized as WhisperSourceScene)) {
    return normalized as WhisperSourceScene
  }
  return RECOMMENDATION_ROUTE_SCENES.has(normalized) ? 'recommendation' : 'profile'
}

export function resolveWhisperErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : ''
  if (TECHNICAL_FIELD_PATTERN.test(message)) return EXPIRED_ENTRY_MESSAGE
  return message || fallback
}
