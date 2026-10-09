import type { AboutMeQuestion, OpenTextDetail } from '@/types/prd01'

export type ProfileAboutSummaryItem = {
  key: string
  title: string
  placeholder: string
  value: string
}

export const PROFILE_ABOUT_SUMMARY_DEFINITIONS = [
  {
    key: 'meetingPreference',
    title: '见面便好',
    placeholder: '你觉得什么时候见面会让你感兴趣？积极见面可以明显提升脱单效率哦',
  },
  {
    key: 'preferredActivities',
    title: '喜欢的见面活动',
    placeholder: '说说你对另一半见面喜欢的活动吧',
  },
  {
    key: 'housingStatus',
    title: '住房情况',
    placeholder: '说说你的住房情况',
  },
] as const

/** 本人编辑页优先展示最新提交；没有最新提交时再展示最近已生效内容。 */
export function resolveOwnerVisibleText(detail?: Pick<OpenTextDetail, 'latestContent' | 'effectiveContent'>) {
  return String(detail?.latestContent || '').trim() || String(detail?.effectiveContent || '').trim()
}

/** 主页预览仅展示已审核生效内容，不能回退到待审或驳回稿。 */
export function resolvePreviewVisibleText(detail?: Pick<OpenTextDetail, 'effectiveContent'>) {
  return String(detail?.effectiveContent || '').trim()
}

/** 主页预览仅返回已审核生效的自我介绍问答。 */
export function buildProfilePreviewAboutSummary(
  questions: Array<Pick<AboutMeQuestion, 'questionKey' | 'title' | 'placeholder' | 'effectiveContent'>> = []
): ProfileAboutSummaryItem[] {
  const definitionByKey = new Map<string, (typeof PROFILE_ABOUT_SUMMARY_DEFINITIONS)[number]>(
    PROFILE_ABOUT_SUMMARY_DEFINITIONS.map(item => [item.key, item])
  )
  return questions.flatMap(question => {
    const value = resolvePreviewVisibleText(question)
    if (!value) return []
    const definition = definitionByKey.get(question.questionKey)
    return [{
      key: question.questionKey,
      title: String(question.title || definition?.title || question.questionKey),
      placeholder: String(question.placeholder || definition?.placeholder || ''),
      value,
    }]
  })
}

function toProfileAboutSummaryItem(
  question: Pick<AboutMeQuestion, 'questionKey' | 'title' | 'placeholder'>,
  value: string,
): ProfileAboutSummaryItem {
  const definition = PROFILE_ABOUT_SUMMARY_DEFINITIONS.find(item => item.key === question.questionKey)
  return {
    key: question.questionKey,
    title: String(question.title || definition?.title || question.questionKey),
    placeholder: String(question.placeholder || definition?.placeholder || ''),
    value,
  }
}

/** “补充更多关于我”按后台返回顺序展示可见题目的前三项。 */
export function buildProfileAboutPrompts(
  questions: Array<Pick<AboutMeQuestion, 'questionKey' | 'title' | 'placeholder'>> = [],
): ProfileAboutSummaryItem[] {
  return questions.slice(0, 3).map(question => toProfileAboutSummaryItem(question, ''))
}

/**
 * 未填写任何内容时按后台题目顺序展示前三项；已有填写时按接口顺序展示全部已填写条目。
 */
export function buildProfileAboutSummary(
  questions: Array<Pick<AboutMeQuestion, 'questionKey' | 'title' | 'placeholder' | 'latestContent' | 'effectiveContent'>> = [],
  visibleFieldKeys?: string[]
): ProfileAboutSummaryItem[] {
  const visibleKeys = visibleFieldKeys ? new Set(visibleFieldKeys) : null
  const filled = questions.flatMap(question => {
    if (visibleKeys && !visibleKeys.has(question.questionKey)) return []
    const value = resolveOwnerVisibleText(question)
    if (!value) return []
    return [toProfileAboutSummaryItem(question, value)]
  })
  if (filled.length) return filled
  return questions
    .filter(question => !visibleKeys || visibleKeys.has(question.questionKey))
    .slice(0, 3)
    .map(question => toProfileAboutSummaryItem(question, ''))
}
