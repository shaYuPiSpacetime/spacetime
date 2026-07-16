import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import ProfileTagChip from '@/components/ProfileTagChip'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { DictOption } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'
import { emitProfileUpdated } from '@/utils/profileEditEvents'
import type { ProfileTagItem } from '@/utils/profileTags'

export default function ProfileEditTagsPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const groups = usePrd01Store(state => state.profileOptions?.profileTagGroups || [])
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        setSelectedTags(parseTagCodes(await prd01Api.getTags()))
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  const allOptions = useMemo(() => uniqueOptions(groups.flatMap(group => group.options)), [groups])
  const visibleGroups = useMemo(() => groups.filter(group => group.categoryCode !== 'ALL'), [groups])
  const options = activeCategory === 'ALL'
    ? allOptions
    : groups.find(group => group.categoryCode === activeCategory)?.options || []
  const selectedOptions = allOptions.filter(option => selectedTags.includes(option.code))

  const toggle = async (option: DictOption) => {
    if (saving) return
    const next = selectedTags.includes(option.code)
      ? selectedTags.filter(code => code !== option.code)
      : [...selectedTags, option.code]
    if (next.length > 16) {
      await Taro.showToast({ title: '最多选择 16 个标签', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      await prd01Api.saveTags(next)
      setSelectedTags(next)
      const items: ProfileTagItem[] = allOptions
        .filter(item => next.includes(item.code))
        .map(item => ({ code: item.code, label: item.label }))
      emitProfileUpdated({ type: 'tags', codes: next, labels: items.map(item => item.label), items })
    } catch (error) {
      await showError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ height: '100vh', overflow: 'hidden', background: 'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 50%, rgba(248,250,239,0.72) 100%)' }}>
      <LanhuSubNav title="我的标签" onBack={navigateBackOrRedirect} />
      <ScrollView scrollX style={{ width: '750rpx', height: '96rpx', whiteSpace: 'nowrap' }} showScrollbar={false}>
        <View style={{ display: 'inline-flex', height: '96rpx', padding: '0 28rpx', alignItems: 'center' }}>
          <CategoryTab label="全部" active={activeCategory === 'ALL'} onClick={() => setActiveCategory('ALL')} />
          {visibleGroups.map(group => (
            <CategoryTab key={group.categoryCode} label={group.categoryLabel} active={activeCategory === group.categoryCode} onClick={() => setActiveCategory(group.categoryCode)} />
          ))}
        </View>
      </ScrollView>
      <ScrollView scrollY style={{ height: 'calc(100vh - 370rpx)' }} showScrollbar={false}>
        <View style={{ width: '700rpx', minHeight: '960rpx', margin: '0 auto', borderRadius: '16rpx', background: '#FFFFFF', padding: '30rpx 28rpx 220rpx', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', boxSizing: 'border-box' }}>
          {options.map((option, index) => {
            const active = selectedTags.includes(option.code)
            return (
              <View key={option.code} style={{ width: '206rpx', marginRight: (index + 1) % 3 === 0 ? '0' : '14rpx', marginBottom: '12rpx' }}>
                <ProfileTagChip item={{ code: option.code, label: option.label }} active={active} width="206rpx" height="88rpx" onClick={() => void toggle(option)} />
              </View>
            )
          })}
        </View>
      </ScrollView>
      <View data-role="selected-tag-drawer" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, minHeight: expanded ? '330rpx' : '174rpx', borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF', boxShadow: '0 -8rpx 24rpx rgba(11,38,90,0.06)', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 20 }}>
        <View style={{ height: '94rpx', padding: '0 30rpx', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => setExpanded(value => !value)}>
          <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>已添加 {selectedTags.length}/16</Text>
          <Text style={{ color: '#999999', fontSize: '26rpx', lineHeight: '38rpx' }}>{expanded ? '收起⌃' : '展开⌃'}</Text>
        </View>
        <ScrollView scrollX={!expanded} scrollY={expanded} style={{ height: expanded ? '210rpx' : '80rpx', whiteSpace: expanded ? 'normal' : 'nowrap', borderTop: '1rpx solid #EEF1F5' }} showScrollbar={false}>
          <View style={{ display: 'flex', flexWrap: expanded ? 'wrap' : 'nowrap', padding: '20rpx 30rpx' }}>
            {selectedOptions.map(option => (
              <View key={option.code} style={{ marginRight: '10rpx', marginBottom: '10rpx', flexShrink: 0 }}>
                <ProfileTagChip item={{ code: option.code, label: option.label }} compact suffix=" ×" onClick={() => void toggle(option)} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <View onClick={onClick} style={{ position: 'relative', height: '58rpx', minWidth: '104rpx', borderRadius: '12rpx', background: active ? '#2876FF' : '#E3F1FE', padding: '0 28rpx', marginRight: '10rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
      <Text style={{ color: active ? '#FFFFFF' : '#7D8799', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: active ? 700 : 400 }}>{label}</Text>
      {active ? <View style={{ position: 'absolute', left: '50%', bottom: '-10rpx', width: 0, height: 0, borderLeft: '10rpx solid transparent', borderRight: '10rpx solid transparent', borderTop: '12rpx solid #2876FF', transform: 'translateX(-50%)' }} /> : null}
    </View>
  )
}

function uniqueOptions(options: DictOption[]) {
  return Array.from(new Map(options.map(option => [option.code, option])).values())
}

function parseTagCodes(value: string) {
  if (!value) return []
  try {
    const result = JSON.parse(value)
    if (Array.isArray(result)) return result.map(String)
  } catch {
    // 兼容历史逗号分隔数据。
  }
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
