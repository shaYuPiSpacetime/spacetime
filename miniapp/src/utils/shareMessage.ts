import Taro from '@tarojs/taro'
import profileCover from '@/assets/share/profile.png'
import postCover from '@/assets/share/post.png'
import topicCover from '@/assets/share/topic.png'
import inviteCover from '@/assets/share/invite.png'
import type { SharePresentation } from '@/domain/sharePresentation'

const covers = { profile: profileCover, post: postCover, topic: topicCover, invite: inviteCover }

/** 返回同步保底图；原图加载通过后才替换，且在微信三秒限制前结束。 */
export function shareMessage(presentation: SharePresentation): Taro.ShareAppMessageReturnObject & {
  promise?: Promise<Taro.ShareAppMessageReturnObject>
} {
  const fallback = {
    title: presentation.title,
    path: presentation.path,
    imageUrl: covers[presentation.kind],
  }
  // 分享仅使用公开 HTTP(S) 图片，拒绝编辑草稿中的临时路径和不支持的图片格式。
  const candidates = Array.from(new Set(presentation.images.map(url => url?.trim()).filter(
    (url): url is string => Boolean(url && /^https:\/\//i.test(url))
  ))).slice(0, 3)
  if (!candidates.length) return fallback

  const promise = new Promise<typeof fallback>(resolve => {
    const loaded: string[] = []
    const finish = () => resolve({ ...fallback, imageUrl: loaded.find(Boolean) || fallback.imageUrl })
    const timer = setTimeout(finish, 1800)
    void Promise.all(candidates.map(async (src, index) => {
      try {
        const image = await Taro.getImageInfo({ src })
        if (!image.path || !image.width || !image.height || !/^(png|jpe?g)$/i.test(image.type || '')) return ''
        loaded[index] = image.path
        // 第一张已经可用时无需等待更低优先级的图片。
        if (index === 0) { clearTimeout(timer); finish() }
        return image.path
      } catch {
        return ''
      }
    })).then(() => {
      clearTimeout(timer)
      finish()
    })
  })
  return { ...fallback, promise }
}
