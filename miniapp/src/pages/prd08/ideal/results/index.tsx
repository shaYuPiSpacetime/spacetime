import { useRouter } from '@tarojs/taro'
import IdealResultsContent from '@/components/IdealResultsContent'

/** 独立结果入口保留分享、筛选及解锁返回路由，内容与推荐主页面一致。 */
export default function IdealResultsPage() {
  const router = useRouter()
  const snapshotNo = String(router.params.snapshotNo || '')
  return <IdealResultsContent key={snapshotNo} snapshotNo={snapshotNo} />
}
