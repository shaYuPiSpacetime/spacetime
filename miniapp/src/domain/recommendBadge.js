export function resolveRecommendBadgeCount(page) {
  if (!page || !Array.isArray(page.items) || page.items.length === 0) return 0
  const remaining = Number(page.remainingBrowseCount)
  return Number.isFinite(remaining) ? Math.max(0, remaining) : 0
}

/** 浏览动作成功后同步服务端已扣除的额度，仅更新仍含该候选的当前页。 */
export function applyRecommendViewToPage(page, candidateNo) {
  if (!page || !page.items?.some(item => item.candidateNo === candidateNo)) return page
  const remaining = page.remainingBrowseCount
  if (remaining == null || !Number.isFinite(remaining)) return page
  return { ...page, remainingBrowseCount: Math.max(0, remaining - 1) }
}

/** 多个底部栏共用推荐数字：合并刷新，保留最近结果，阻止旧响应覆盖浏览后的数字。 */
export function createRecommendBadgeRuntime({ fetchPage, now = Date.now }) {
  let state = { ownerId: null, count: 0, updatedAt: 0, nextResetAt: null }
  let generation = 0
  let pending = null
  const listeners = new Set()
  const update = next => {
    state = next
    listeners.forEach(listener => listener(state))
  }
  const reset = () => {
    generation += 1
    pending = null
    update({ ownerId: null, count: 0, updatedAt: 0, nextResetAt: null })
  }
  const publishPage = (ownerId, page) => {
    generation += 1
    update({ ownerId, count: resolveRecommendBadgeCount(page), updatedAt: now(), nextResetAt: page?.nextResetAt || null })
  }
  const refresh = (ownerId, force = false) => {
    if (!ownerId) {
      reset()
      return Promise.resolve()
    }
    if (state.ownerId !== ownerId) {
      reset()
      update({ ...state, ownerId })
    }
    if (pending?.ownerId === ownerId) return pending.task
    const resetAt = state.nextResetAt ? new Date(state.nextResetAt.replace(' ', 'T')).getTime() : Infinity
    if (!force && state.updatedAt > 0 && now() - state.updatedAt < 30000 && now() < resetAt) {
      return Promise.resolve()
    }
    const requestGeneration = ++generation
    const request = { ownerId, task: null }
    request.task = Promise.resolve(fetchPage()).then(page => {
      if (generation !== requestGeneration || state.ownerId !== ownerId) return
      update({ ownerId, count: resolveRecommendBadgeCount(page), updatedAt: now(), nextResetAt: page?.nextResetAt || null })
    }).catch(() => {
      // 短暂网络失败不把已经确认的推荐数字清零。
    }).finally(() => {
      if (pending === request) pending = null
    })
    pending = request
    return request.task
  }
  return {
    getSnapshot: () => state,
    subscribe: listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    publishPage,
    refresh,
    reset,
  }
}
