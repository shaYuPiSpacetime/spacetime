import { get, post } from './request'

/** 量表基本信息 */
export interface ScaleVO {
  id: number
  name: string
  description: string
  questionCount: number
  duration: string
  icon: string
}

/** 测评报告 */
export interface AssessmentReportVO {
  id: number
  scaleName: string
  score: number
  resultLevel: string
  resultText: string
  dimensions: { name: string; score: number; desc: string }[]
  createTime: string
}

/** 获取量表列表 */
export function getScaleList(): Promise<ScaleVO[]> {
  return get<ScaleVO[]>('/miniapp/assessment/scales')
}

/** 提交测评作答 */
export function submitAnswer(scaleId: number, answers: { questionId: number; optionId: number }[]): Promise<number> {
  return post<number>('/miniapp/assessment/submit', { scaleId, answers })
}

/** 获取测评报告 */
export function getReport(reportId: number): Promise<AssessmentReportVO> {
  return get<AssessmentReportVO>(`/miniapp/assessment/report/${reportId}`)
}
