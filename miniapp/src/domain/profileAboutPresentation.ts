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

/**
 * 编辑资料总页只固定展示蓝湖定义的三项摘要。
 * 接口可以返回更多问题或改变顺序，但不能挤掉、打乱这三个入口。
 */
export function buildProfileAboutSummary(
  questions: Array<Pick<AboutMeQuestion, 'questionKey' | 'latestContent' | 'effectiveContent'>> = []
): ProfileAboutSummaryItem[] {
  const questionByKey = new Map(questions.map(question => [question.questionKey, question]))
  return PROFILE_ABOUT_SUMMARY_DEFINITIONS.map(definition => {
    const question = questionByKey.get(definition.key)
    return {
      ...definition,
      value: resolveOwnerVisibleText(question),
    }
  })
}
