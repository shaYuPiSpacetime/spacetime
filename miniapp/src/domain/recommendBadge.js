export function resolveRecommendBadgeCount(page) {
  if (!page || !Array.isArray(page.items) || page.items.length === 0) return 0
  const viewed = new Set(page.viewedCandidateNos || [])
  const candidates = new Set(page.items.filter(item => !viewed.has(item.candidateNo)).map(item => item.candidateNo))
  if (page.remainingBrowseCount == null) return candidates.size
  const remaining = Number(page.remainingBrowseCount)
  return Number.isFinite(remaining) ? Math.min(candidates.size, Math.max(0, remaining)) : 0
}

/** 按游标收齐额度内的真实候选，空扫描页继续查询，重复游标或筛选变化时拒绝发布不完整数字。 */
export async function collectRecommendCandidatePages(fetchPage, cursor) {
  const first = await fetchPage(cursor)
  const remaining = first.remainingBrowseCount
  const limit = remaining == null ? Infinity : Math.max(0, Number(remaining) || 0)
  const candidates = new Map()
  const visited = new Set(cursor ? [cursor] : [])
  let page = first
  while (true) {
    if (page.preferenceVersion !== first.preferenceVersion || page.nextResetAt !== first.nextResetAt
      || page.remainingBrowseCount !== remaining || page.browseQuota !== first.browseQuota) {
      throw new Error('推荐条件已变化，请刷新后重试')
    }
    for (const item of page.items || []) {
      if (candidates.size >= limit) break
      candidates.set(item.candidateNo, item)
    }
    if (!page.nextCursor || candidates.size >= limit) break
    if (visited.has(page.nextCursor)) throw new Error('推荐数据获取失败，请刷新后重试')
    visited.add(page.nextCursor)
    page = await fetchPage(page.nextCursor)
  }
  return {
    ...first,
    items: [...candidates.values()],
    nextCursor: page.nextCursor,
    waitingReason: candidates.size ? null : page.waitingReason,
  }
}

/** 浏览动作成功后同步服务端已扣除的额度，仅更新仍含该候选的当前页。 */
export function applyRecommendViewToPage(page, candidateNo) {
  if (!page || !page.items?.some(item => item.candidateNo === candidateNo)) return page
  if (page.viewedCandidateNos?.includes(candidateNo)) return page
  const remaining = page.remainingBrowseCount
  return {
    ...page,
    viewedCandidateNos: [...(page.viewedCandidateNos || []), candidateNo],
    remainingBrowseCount: remaining == null || !Number.isFinite(remaining) ? remaining : Math.max(0, remaining - 1),
  }
}

/** 多个底部栏共用推荐数字：合并刷新，保留最近结果，阻止旧响应覆盖浏览后的数字。 */
export function createRecommendBadgeRuntime({ fetchPage, now = Date.now }) {
  let state = { ownerId: null, count: 0, updatedAt: 0, nextResetAt: null, preferenceVersion: null, browseQuota: null }
  let generation = 0
  let pending = null
  const listeners = new Set()
  const update = next => {
    // 同一偏好和周期内，浏览只会减少未看人数；切 Tab 的后台刷新不能把数字加回去。
    if (state.updatedAt > 0 && state.ownerId === next.ownerId && next.nextResetAt
      && state.nextResetAt === next.nextResetAt && state.preferenceVersion === next.preferenceVersion
      && state.browseQuota === next.browseQuota) {
      next.count = Math.min(state.count, next.count)
    }
    state = next
    listeners.forEach(listener => listener(state))
  }
  const reset = () => {
    generation += 1
    pending = null
    update({ ownerId: null, count: 0, updatedAt: 0, nextResetAt: null, preferenceVersion: null, browseQuota: null })
  }
  const publishPage = (ownerId, page) => {
    generation += 1
    update({ ownerId, count: resolveRecommendBadgeCount(page), updatedAt: now(), nextResetAt: page?.nextResetAt || null, preferenceVersion: page?.preferenceVersion ?? null, browseQuota: page?.browseQuota ?? null })
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
    const resetAt = state.nextResetAt ? Date.parse(`${state.nextResetAt.replace(' ', 'T')}+08:00`) : Infinity
    if (!force && state.updatedAt > 0 && now() - state.updatedAt < 30000 && now() < resetAt) {
      return Promise.resolve()
    }
    const requestGeneration = ++generation
    const request = { ownerId, task: null }
    request.task = Promise.resolve(fetchPage()).then(page => {
      if (generation !== requestGeneration || state.ownerId !== ownerId) return
      update({ ownerId, count: resolveRecommendBadgeCount(page), updatedAt: now(), nextResetAt: page?.nextResetAt || null, preferenceVersion: page?.preferenceVersion ?? null, browseQuota: page?.browseQuota ?? null })
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
