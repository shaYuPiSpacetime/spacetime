function clampPercent(value) {
  return Math.min(Math.max(value, 0), 100)
}
/**
 * 将动态阶梯切成当前三档展示阶段，并让节点与进度共用同一阈值坐标系。
 */
export function displayedLadderStage(ladders = [], current = 0) {
  if (!Array.isArray(ladders) || ladders.length === 0) {
    return {
      ladders: [],
      stageBase: 0,
      max: 0,
      progress: 0,
    }
  }

  const ordered = [...ladders].sort((left, right) => left.threshold - right.threshold)
  const firstPending = ordered.findIndex(item => !item.achieved && current < item.threshold)
  const pivot = firstPending < 0 ? ordered.length - 1 : firstPending
  const start = Math.max(0, Math.floor(pivot / 3) * 3)
  const visible = ordered.slice(start, start + 3)
  const stageBase = start > 0 ? ordered[start - 1].threshold : 0
  const stageMax = visible[visible.length - 1]?.threshold || ordered[ordered.length - 1].threshold
  const span = Math.max(stageMax - stageBase, 1)
  const progress = clampPercent(((current - stageBase) / span) * 100)

  return {
    ladders: visible.map(item => ({
      ...item,
      positionPercent: clampPercent(((item.threshold - stageBase) / span) * 100),
    })),
    stageBase,
    max: stageMax,
    progress,
  }
}
