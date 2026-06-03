import { useState, useCallback } from 'react'

interface UsePageOptions {
  defaultSize?: number
}

/**
 * 分页加载 hook
 * 封装下拉刷新 + 上拉加载更多的通用逻辑
 */
export function usePage<T>(fetchFn: (page: number, size: number) => Promise<T[]>, options?: UsePageOptions) {
  const size = options?.defaultSize || 10
  const [list, setList] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  /** 加载数据 */
  const loadData = useCallback(async (pageNum: number) => {
    if (loading) return
    setLoading(true)
    try {
      const data = await fetchFn(pageNum, size)
      if (pageNum === 1) {
        setList(data)
      } else {
        setList(prev => [...prev, ...data])
      }
      setHasMore(data.length >= size)
      setPage(pageNum)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, size, loading])

  /** 下拉刷新 */
  const onRefresh = useCallback(() => {
    loadData(1)
  }, [loadData])

  /** 上拉加载更多 */
  const onLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadData(page + 1)
    }
  }, [hasMore, loading, page, loadData])

  return { list, loading, hasMore, onRefresh, onLoadMore, loadData: () => loadData(1) }
}
