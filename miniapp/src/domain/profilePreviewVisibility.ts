import type { ProfileTagItem } from '@/utils/profileTags'

type ProfilePreviewVisibilityInput = {
  tags: ProfileTagItem[]
  introduction: string
  photos: string[]
  certifications: Array<{ passed: boolean }>
  favoriteSong: string
  aboutMe?: Array<{ title: string; value: string }>
}

export type ProfilePreviewVisibleContent = {
  tags: ProfileTagItem[]
  introduction: string
  photos: string[]
  showCertification: boolean
  favoriteSong: string
  aboutMe: Array<{ title: string; value: string }>
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
    photos: input.photos.map(normalizeText).filter(Boolean),
    showCertification: input.certifications.some(item => item.passed),
    favoriteSong: normalizeText(input.favoriteSong),
    aboutMe: (input.aboutMe || []).flatMap(item => {
      const title = normalizeText(item.title)
      const value = normalizeText(item.value)
      return title && value ? [{ title, value }] : []
    }),
  }
}
