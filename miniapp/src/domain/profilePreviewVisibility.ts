import type { ProfileTagItem } from '@/utils/profileTags'

type ProfilePreviewVisibilityInput = {
  tags: ProfileTagItem[]
  introduction: string
  photos: string[]
  certifications: Array<{ passed: boolean }>
  favoriteSong: string
}

export type ProfilePreviewVisibleContent = {
  tags: ProfileTagItem[]
  introduction: string
  photos: string[]
  showCertification: boolean
  favoriteSong: string
}

const normalizeText = (value: string) => String(value || '').trim()

/** 主页预览只返回用户真实填写且可展示的内容。 */
export function buildProfilePreviewVisibility(
  input: ProfilePreviewVisibilityInput,
): ProfilePreviewVisibleContent {
  return {
    tags: input.tags.flatMap(item => {
      const code = normalizeText(item.code)
      const label = normalizeText(item.label)
      return code && label ? [{ code, label }] : []
    }),
    introduction: normalizeText(input.introduction),
    photos: input.photos.map(normalizeText).filter(Boolean).slice(0, 4),
    showCertification: input.certifications.some(item => item.passed),
    favoriteSong: normalizeText(input.favoriteSong),
  }
}
