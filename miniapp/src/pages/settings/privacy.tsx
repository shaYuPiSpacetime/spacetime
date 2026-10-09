import { Button, Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { isCoolingOff } from '@/domain/settingsFlow'
import { settingsApi } from '@/services/settings'
import type { AccountCancelStatus, BlockedUserVO } from '@/types/settings'
import { normalizeAvatarUrl } from '@/utils/avatar'
import defaultAvatar from '@/assets/profile/default-avatar.webp'
import SettingsShell from './components/SettingsShell'

export default function PrivacySettingsPage() {
  const [status, setStatus] = useState<AccountCancelStatus>({ status: 'NONE' })
  const [loading, setLoading] = useState(true)
  const [copyConfig, setCopyConfig] = useState<Record<string, string>>({})
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserVO[]>([])
  const [blockedTotal, setBlockedTotal] = useState(0)
  const [blockedPage, setBlockedPage] = useState(1)
  const [blockedLoading, setBlockedLoading] = useState(false)
  const [blockedError, setBlockedError] = useState(false)
  const [removingIds, setRemovingIds] = useState<number[]>([])
  const statusRequestRef = useRef(0)

  useEffect(() => {
    void settingsApi.publicConfig([
        'privacy.intro_title',
        'privacy.intro_copy',
        'privacy.cooling_title',
        'privacy.cooling_end_label',
        'privacy.loading_text',
        'privacy.load_failed_text',
      ]).then(copyResult => {
      setCopyConfig(copyResult || {})
    }).catch(error => Taro.showToast({
      title: error instanceof Error ? error.message : '',
      icon: 'none',
    }))
  }, [])

  useDidShow(() => {
    const request = ++statusRequestRef.current
    setLoading(true)
    void settingsApi.cancelStatus().then(result => {
      if (request === statusRequestRef.current) setStatus(result)
    }).catch(error => Taro.showToast({
      title: error instanceof Error ? error.message : '注销状态读取失败',
      icon: 'none',
    })).finally(() => {
      if (request === statusRequestRef.current) setLoading(false)
    })
    void loadBlacklist(false)
  })

  async function loadBlacklist(append: boolean) {
    if (blockedLoading) return
    const nextPage = append ? blockedPage + 1 : 1
    setBlockedLoading(true)
    setBlockedError(false)
    try {
      const result = await settingsApi.blacklist(nextPage, 20)
      setBlockedUsers(current => append ? [...current, ...(result.records || [])] : (result.records || []))
      setBlockedTotal(result.total || 0)
      setBlockedPage(nextPage)
    } catch (error) {
      setBlockedError(true)
      await Taro.showToast({ title: error instanceof Error ? error.message : '黑名单加载失败', icon: 'none' })
    } finally {
      setBlockedLoading(false)
    }
  }

  async function removeBlockedUser(user: BlockedUserVO) {
    if (removingIds.includes(user.id)) return
    setRemovingIds(ids => [...ids, user.id])
    try {
      await settingsApi.removeBlacklist(user.id)
      setBlockedUsers(users => users.filter(item => item.id !== user.id))
      setBlockedTotal(total => Math.max(0, total - 1))
      await loadBlacklist(false)
      await Taro.showToast({ title: '已解除拉黑', icon: 'success' })
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : '解除拉黑失败，请重试', icon: 'none' })
    } finally {
      setRemovingIds(ids => ids.filter(id => id !== user.id))
    }
  }

  const cooling = isCoolingOff(status)
  const copy = (key: string) => copyConfig[key] || ''

  function openCompliance(contentCode: string, title: string) {
    void Taro.navigateTo({
      url: `/pages/settings/content?contentCode=${encodeURIComponent(contentCode)}&title=${encodeURIComponent(title)}`,
    })
  }

  return (
    <SettingsShell title="隐私设置" scroll>
      <View className="privacy-intro">
        <Text className="privacy-intro__title">{copy('privacy.intro_title')}</Text>
        <Text className="privacy-intro__copy">{copy('privacy.intro_copy')}</Text>
      </View>

      {cooling ? (
        <View className="privacy-cooling">
          <Text className="privacy-cooling__title">{copy('privacy.cooling_title')}</Text>
          <Text className="privacy-cooling__copy">{copy('privacy.cooling_end_label')}{status.coolingEndTime || ''}</Text>
        </View>
      ) : null}

      <View className="settings-main-card privacy-card">
        <Button
          className="settings-row has-divider"
          onClick={() => void Taro.navigateTo({ url: '/pages/settings/account-cancel' })}
          hoverClass="settings-hover"
        >
          <Text className="settings-row__label">注销账号</Text>
          <Text className="settings-row__value">{loading ? copy('privacy.loading_text') : cooling ? copy('privacy.cooling_title') : ''}</Text>
          <View className="settings-row__arrow" />
        </Button>
        <Button
          className="settings-row has-divider"
          onClick={() => openCompliance('privacy_policy', '隐私政策')}
          hoverClass="settings-hover"
        >
          <Text className="settings-row__label">隐私政策</Text>
          <View className="settings-row__arrow" />
        </Button>
        <Button
          className="settings-row"
          onClick={() => openCompliance('personal_info_list', '个人信息收集清单')}
          hoverClass="settings-hover"
        >
          <Text className="settings-row__label">个人信息收集清单</Text>
          <View className="settings-row__arrow" />
        </Button>
      </View>
      <View style={{ marginTop: '28rpx', borderRadius: '8rpx', background: '#FFFFFF', overflow: 'hidden' }}>
        <View style={{ minHeight: '92rpx', padding: '0 30rpx', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1rpx solid #F1F2F5' }}>
          <Text style={{ color: '#595F77', fontSize: '28rpx', fontWeight: 600 }}>黑名单</Text>
          <Text style={{ color: '#999999', fontSize: '23rpx' }}>{blockedTotal} 人</Text>
        </View>
        {blockedUsers.length ? blockedUsers.map(user => (
          <View key={user.id} style={{ minHeight: '112rpx', padding: '14rpx 24rpx', display: 'flex', alignItems: 'center', borderBottom: '1rpx solid #F1F2F5', boxSizing: 'border-box' }}>
            <Image src={normalizeAvatarUrl(user.targetAvatar || '', defaultAvatar)} mode="aspectFill" style={{ width: '72rpx', height: '72rpx', borderRadius: '36rpx', background: '#EEF1F5' }} />
            <Text style={{ flex: 1, minWidth: 0, marginLeft: '18rpx', color: '#595F77', fontSize: '26rpx', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.targetNickname || '用户'}</Text>
            <View onClick={() => void removeBlockedUser(user)} style={{ minWidth: '112rpx', height: '56rpx', marginLeft: '16rpx', borderRadius: '28rpx', border: '1rpx solid #2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', opacity: removingIds.includes(user.id) ? 0.55 : 1 }}>
              <Text style={{ color: '#2876FF', fontSize: '23rpx' }}>{removingIds.includes(user.id) ? '处理中' : '解除拉黑'}</Text>
            </View>
          </View>
        )) : blockedLoading ? <Text style={{ display: 'block', padding: '36rpx 24rpx', color: '#999999', fontSize: '24rpx', textAlign: 'center' }}>正在加载黑名单…</Text> : blockedError ? <Text onClick={() => void loadBlacklist(false)} style={{ display: 'block', padding: '36rpx 24rpx', color: '#2876FF', fontSize: '24rpx', textAlign: 'center' }}>加载失败，点击重试</Text> : <Text style={{ display: 'block', padding: '36rpx 24rpx', color: '#999999', fontSize: '24rpx', textAlign: 'center' }}>暂无拉黑用户</Text>}
        {blockedUsers.length < blockedTotal ? <View onClick={() => void loadBlacklist(true)} style={{ height: '78rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#2876FF', fontSize: '24rpx' }}>{blockedLoading ? '加载中…' : '加载更多'}</Text></View> : null}
      </View>
    </SettingsShell>
  )
}
