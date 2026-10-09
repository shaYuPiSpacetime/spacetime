import type { AboutMeQuestion, ProfileFieldSetting } from '@/types/prd01'

export const PROFILE_ABOUT_TABS = [
  { key: 'all', title: '全部', questionKeys: [] },
  { key: 'self', title: '我是谁', questionKeys: ['housingStatus', 'carStatus', 'hasChild', 'religion'] },
  { key: 'daily', title: '我的日常', questionKeys: ['smoking', 'drinking', 'pets'] },
  { key: 'story', title: '我的故事', questionKeys: ['childrenPlan', 'marriagePlan'] },
  { key: 'love', title: '我热爱的', questionKeys: ['meetingPreference', 'preferredActivities'] },
] as const

export const PROFILE_ABOUT_FIELD_KEYS = PROFILE_ABOUT_TABS
  .flatMap(tab => tab.questionKeys)

type AboutQuestionKey = Pick<AboutMeQuestion, 'questionKey'>
type FieldVisibility = Pick<ProfileFieldSetting, 'fieldId' | 'visible'>

/** 配置缺失时默认展示，兼容尚未补齐字段配置的历史版本。 */
export function isAboutFieldVisible(
  fieldId: string,
  fieldSettings: FieldVisibility[] = []
): boolean {
  return fieldSettings.find(item => item.fieldId === fieldId)?.visible !== false
}

/** 过滤明确被后台关闭的“关于我”问题，保持接口原始顺序。 */
export function filterVisibleAboutQuestions<T extends AboutQuestionKey>(
  questions: T[] = [],
  fieldSettings: FieldVisibility[] = []
): T[] {
  return questions.filter(question => isAboutFieldVisible(question.questionKey, fieldSettings))
}

/** 返回当前可展示的“关于我”字段集合，供摘要默认项同步显隐。 */
export function visibleAboutFieldKeys(fieldSettings: FieldVisibility[] = []): string[] {
  return PROFILE_ABOUT_FIELD_KEYS.filter(fieldId => isAboutFieldVisible(fieldId, fieldSettings))
}

/** 仅保留至少包含一个可见问题的分类；无题目时连“全部”也不展示。 */
export function buildVisibleAboutTabs<T extends AboutQuestionKey>(questions: T[] = []) {
  const visibleKeys = new Set(questions.map(question => question.questionKey))
  if (visibleKeys.size === 0) return []
  return PROFILE_ABOUT_TABS.filter(tab =>
    tab.key === 'all' || tab.questionKeys.some(questionKey => visibleKeys.has(questionKey))
  )
}
