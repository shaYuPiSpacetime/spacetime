import { ScrollView, View } from '@tarojs/components'
import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TabKey } from '@/components/AppTabBar'
import { registerTabHost, takeRequestedTab, type TabPanel } from '@/custom-tab-bar/tabHost'
import { setActiveTabKey } from '@/custom-tab-bar/tabState'
import IndexPanel from '@/pages/index/panel'
import CommunityPanel from '@/pages/community/panel'
import RecommendPanel from '@/pages/recommend/panel'
import ChatPanel from '@/pages/chat/panel'
import ProfilePanel from '@/pages/profile/panel'
import { useAuthStore } from '@/stores/authStore'
import { TabActivity } from './activity'

const panels = { index: IndexPanel, community: CommunityPanel, recommend: RecommendPanel, chat: ChatPanel, profile: ProfilePanel }
const panelFor = (key: TabKey): TabPanel => key === 'kindred' ? 'index' : key

function WechatTabs({ entry }: { entry: TabPanel }) {
  const route = `pages/${entry}/index`
  const [key, setKey] = useState<TabKey>(entry)
  const [visited, setVisited] = useState<TabPanel[]>([entry])
  const [visible, setVisible] = useState(true)
  const selected = useRef<TabKey>(entry)
  const activePanel = panelFor(key)
  const select = useCallback((next: TabKey) => {
    selected.current = next
    const panel = panelFor(next)
    setVisited(previous => previous.includes(panel) ? previous : [...previous, panel])
    setKey(next)
    setActiveTabKey(next)
  }, [])

  useLayoutEffect(() => registerTabHost(route, { selected: () => selected.current, select }), [route, select])
  useDidShow(() => {
    select(takeRequestedTab(route) ?? selected.current)
    setVisible(true)
  })
  useDidHide(() => setVisible(false))
  useEffect(() => {
    if (!visible) return
    const result = activePanel === 'index' ? Taro.showShareMenu({}) : Taro.hideShareMenu({})
    void result.catch(() => {})
  }, [activePanel, visible])

  return (
    <View id="main-tabs" style={{ height: '100vh' }}>
      {visited.map(panel => {
        const Panel = panels[panel]
        const active = panel === activePanel
        return (
          <TabActivity.Provider key={panel} value={{ visible: visible && active, isEntry: panel === entry }}>
            <View id={`main-tab-panel-${panel}`} style={{ display: active ? 'block' : 'none' }}>
              {panel === 'profile'
                ? <ScrollView scrollY style={{ height: '100vh' }}><Panel /></ScrollView>
                : <Panel />}
            </View>
          </TabActivity.Provider>
        )
      })}
    </View>
  )
}

export default function MainTabs({ entry }: { entry: TabPanel }) {
  const userId = useAuthStore(state => state.userId)
  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) return <WechatTabs key={userId} entry={entry} />
  const Panel = panels[entry]
  return <Panel />
}
