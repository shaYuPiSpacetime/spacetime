/** 格式化日期 */
export function formatDate(date: string | Date, fmt = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const o: Record<string, number> = {
    'M+': d.getMonth() + 1,
    'd+': d.getDate(),
    'h+': d.getHours(),
    'm+': d.getMinutes(),
    's+': d.getSeconds()
  }
  let result = fmt
  if (/(y+)/.test(result)) {
    result = result.replace(RegExp.$1, String(d.getFullYear()).slice(4 - RegExp.$1.length))
  }
  for (const k in o) {
    if (new RegExp(`(${k})`).test(result)) {
      result = result.replace(RegExp.$1, String(o[k]).padStart(2, '0'))
    }
  }
  return result
}

/** 格式化金额（分 → 元） */
export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}
