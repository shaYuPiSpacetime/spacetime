import Taro from '@tarojs/taro'
import {
  appendPendingSource,
  appendPendingTraceNo,
  normalizePendingTraceNos,
  normalizePendingSources,
  parsePromotionSource,
  removePendingSource,
  waitWithinBudget,
} from '@/domain/promotionAttribution'
import type { InviteSourceType } from '@/types/promotion'
import { createInviteSourceTrace } from './promotion'

const VISITOR_KEY_STORAGE = 'promotion.visitor-key'
const PENDING_TRACE_NOS_STORAGE = 'promotion.pending-trace-nos'
const PENDING_SOURCES_STORAGE = 'promotion.pending-sources'
const VISITOR_KEY_PATTERN = /^PVK-[a-f0-9]{32}$/

interface PromotionSource extends Record<string, unknown> {
  sourceType: InviteSourceType
  sourceToken: string
}

const traceTasks = new Map<string, Promise<string>>()
const resolvedTraceNos = new Map<string, string>()
const pendingCaptureTasks = new Set<Promise<unknown>>()
let visitorKeyTask: Promise<string> | undefined
let registrationGeneration = 0

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = Taro.getStorageSync(key)
    return value === undefined || value === null || value === '' ? fallback : value as T
  } catch {
    return fallback
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    Taro.setStorageSync(key, value)
  } catch {
    // 本地存储不可用时，本次来源记录仍可完成，只是不参与注册归因。
  }
}

function createFallbackRandomHex() {
  let value = ''
  while (value.length < 32) {
    value += Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0')
  }
  return value.slice(0, 32)
}

async function createVisitorKey() {
  try {
    const result = await Taro.getRandomValues({ length: 16 })
    const bytes = new Uint8Array(result.randomValues)
    const randomHex = Array.from(bytes)
      .map(value => value.toString(16).padStart(2, '0'))
      .join('')
    if (randomHex.length === 32) return `PVK-${randomHex}`
  } catch {
    // H5 或旧基础库可能不支持安全随机数，回退到仅用于幂等的本地随机标识。
  }
  return `PVK-${createFallbackRandomHex()}`
}

async function getOrCreateVisitorKey() {
  const cached = String(readStorage(VISITOR_KEY_STORAGE, '') || '')
  if (VISITOR_KEY_PATTERN.test(cached)) return cached

  if (!visitorKeyTask) {
    visitorKeyTask = createVisitorKey()
      .then(visitorKey => {
        writeStorage(VISITOR_KEY_STORAGE, visitorKey)
        return visitorKey
      })
      .finally(() => {
        visitorKeyTask = undefined
      })
  }
  return visitorKeyTask
}

function sourceKey(source: PromotionSource) {
  return `${source.sourceType}:${source.sourceToken}`
}

function persistPendingTraceNo(traceNo: string) {
  const current = readStorage<unknown[]>(PENDING_TRACE_NOS_STORAGE, [])
  writeStorage(PENDING_TRACE_NOS_STORAGE, appendPendingTraceNo(current, traceNo))
}

function persistPendingSource(source: PromotionSource) {
  const current = readStorage<unknown[]>(PENDING_SOURCES_STORAGE, [])
  writeStorage(PENDING_SOURCES_STORAGE, appendPendingSource(current, source))
}

function clearPendingSource(source: PromotionSource) {
  const current = readStorage<unknown[]>(PENDING_SOURCES_STORAGE, [])
  writeStorage(PENDING_SOURCES_STORAGE, removePendingSource(current, source))
}

/**
 * 采集启动或页面入口中的匿名推广来源。
 * 已登录用户仍记录点击，但不会把 traceNo 留给后续账号注册。
 */
export async function capturePromotionSource(
  query: Record<string, unknown> | undefined,
  persistForRegistration: boolean,
): Promise<boolean> {
  const source = parsePromotionSource(query || {}) as PromotionSource | undefined
  if (!source) return false
  const captureGeneration = registrationGeneration

  if (persistForRegistration) persistPendingSource(source)

  const key = sourceKey(source)
  let traceNo = resolvedTraceNos.get(key)
  if (!traceNo) {
    let traceTask = traceTasks.get(key)
    if (!traceTask) {
      traceTask = getOrCreateVisitorKey()
        .then(visitorKey => createInviteSourceTrace({
          sourceType: source.sourceType,
          sourceToken: source.sourceToken,
          visitorKey,
        }))
        .then(result => {
          resolvedTraceNos.set(key, result.traceNo)
          return result.traceNo
        })
        .finally(() => {
          traceTasks.delete(key)
        })
      traceTasks.set(key, traceTask)
    }

    const trackedTask = traceTask.then(value => {
      traceNo = value
      return value
    })
    pendingCaptureTasks.add(trackedTask)
    try {
      await trackedTask
    } finally {
      pendingCaptureTasks.delete(trackedTask)
    }
  }

  if (persistForRegistration && traceNo && captureGeneration === registrationGeneration) {
    persistPendingTraceNo(traceNo)
    clearPendingSource(source)
  }
  return true
}

/** 登录请求发出前等待仍在进行的匿名来源换号，避免快速登录丢失归因。 */
export async function waitForPromotionAttributionCapture(maxWaitMs = 150) {
  const tasks = Array.from(pendingCaptureTasks)
  const pendingSources = normalizePendingSources(
    readStorage<unknown[]>(PENDING_SOURCES_STORAGE, []),
  ) as PromotionSource[]
  const retryTasks = pendingSources.map(source => capturePromotionSource(source, true))
  const allTasks = [...tasks, ...retryTasks]
  if (!allTasks.length) return true

  // 归因最多占用 150ms 登录预算，超时后继续后台完成，不能阻塞手机号登录。
  return waitWithinBudget(Promise.allSettled(allTasks), maxWaitMs)
}

export function getPendingPromotionTraceNos(): string[] {
  return normalizePendingTraceNos(readStorage<unknown[]>(PENDING_TRACE_NOS_STORAGE, []))
}

/** 登录成功后无论新老用户都清理，防止同设备后续账号串归因。 */
export function clearPendingPromotionTraceNos() {
  registrationGeneration += 1
  try {
    Taro.removeStorageSync(PENDING_TRACE_NOS_STORAGE)
    Taro.removeStorageSync(PENDING_SOURCES_STORAGE)
  } catch {
    writeStorage(PENDING_TRACE_NOS_STORAGE, [])
    writeStorage(PENDING_SOURCES_STORAGE, [])
  }
}
