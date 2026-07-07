import lanhuDemoData from '@/data/lanhuDemo.json'
import type {
  DemoFlowStep,
  LanhuDemoData,
  LanhuDemoPageKey,
  LanhuDesignItem,
} from '@/types/lanhuDemo'

const demoData = lanhuDemoData as LanhuDemoData

/** 获取蓝湖 demo 全量数据，后续接入接口时替换这里的数据来源。 */
export function getLanhuDemoData(): LanhuDemoData {
  return demoData
}

/** 获取蓝湖设计稿 manifest。 */
export function getLanhuDesigns(): LanhuDesignItem[] {
  return demoData.designs
}

/** 获取 demo 主流程。 */
export function getDemoFlow(flowKey: keyof LanhuDemoData['flows'] = 'main'): DemoFlowStep[] {
  return demoData.flows[flowKey] ?? []
}

/** 获取指定页面域的 demo 数据。 */
export function getDemoPageData<K extends LanhuDemoPageKey>(pageKey: K): LanhuDemoData[K] {
  return demoData[pageKey]
}
