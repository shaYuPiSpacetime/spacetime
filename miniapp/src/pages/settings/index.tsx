import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { settingsApi } from '@/services/settings'
import { useAuthStore } from '@/stores/authStore'
import type { SettingsEntry, SettingsHome } from '@/types/settings'
import SettingsDialog from './components/SettingsDialog'
import SettingsShell from './components/SettingsShell'

function Arrow() {
  return <View className="settings-row__arrow" />
}

function SettingsRow({ label, value, arrow = false, divider = true, onClick }: {
  label: string
  value?: string
  arrow?: boolean
  divider?: boolean
  onClick?: () => void
}) {
  return (
    <View className={`settings-row ${divider ? 'has-divider' : ''}`} onClick={onClick} hoverClass={onClick ? 'settings-hover' : 'none'}>
      <Text className="settings-row__label">{label}</Text>
      {value ? <Text className="settings-row__value">{value}</Text> : null}
      {arrow ? <Arrow /> : null}
    </View>
  )
}

export default function SettingsPage() {
  const [home, setHome] = useState<SettingsHome>()
  const [loading, setLoading] = useState(true)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    void loadHome()
  }, [])

  const entryMap = useMemo(
    () => new Map((home?.entries || []).map(entry => [entry.entryKey, entry])),
    [home?.entries],
  )
  const thirdParty = entryMap.get('third_party_list')
  const personalInfo = entryMap.get('personal_info_list')

  async function loadHome() {
    setLoading(true)
    try {
      setHome(await settingsApi.home())
    } catch (error) {
      await showError(error)
    } finally {
      setLoading(false)
    }
  }

  function openEntry(entry?: SettingsEntry) {
    if (!entry?.jumpTarget) {
      void Taro.showToast({ title: '内容暂未配置', icon: 'none' })
      return
    }
    if (entry.jumpType === 'H5') {
      const url = `/pages/settings/content?title=${encodeURIComponent(entry.entryName)}&url=${encodeURIComponent(entry.jumpTarget)}`
      void Taro.navigateTo({ url })
      return
    }
    if (entry.jumpType === 'NATIVE_ROUTE') {
      void Taro.navigateTo({ url: entry.jumpTarget })
      return
    }
    void Taro.showToast({ title: '当前入口暂不可用', icon: 'none' })
  }

  async function confirmLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await settingsApi.logout()
      useAuthStore.getState().logout()
      setLogoutDialogOpen(false)
      await Taro.reLaunch({ url: '/pages/login/index' })
    } catch (error) {
      await showError(error)
    } finally {
      setLoggingOut(false)
    }
  }

  const phoneValue = loading ? '加载中' : home?.phoneBindStatus === 'BOUND' ? (home.maskedPhone || '已绑定') : '未绑定'
  const wechatValue = loading ? '加载中' : home?.wechatBindStatus === 'BOUND' ? '已绑定' : '未绑定'

  return (
    <SettingsShell title="设置">
      <View className="settings-main-card">
        <SettingsRow label="手机号绑定" value={phoneValue} />
        <SettingsRow label="微信绑定" value={wechatValue} />
        <SettingsRow label={thirdParty?.entryName || '第三方信息共享清单'} arrow onClick={() => openEntry(thirdParty)} />
        <SettingsRow label={personalInfo?.entryName || '个人信息收集清单'} arrow onClick={() => openEntry(personalInfo)} />
        <SettingsRow label="关于我们" arrow divider={false} onClick={() => void Taro.navigateTo({ url: '/pages/settings/about' })} />
        <SettingsRow label="退出登录" arrow divider={false} onClick={() => setLogoutDialogOpen(true)} />
      </View>
      <View className="settings-cancel-link" onClick={() => void Taro.navigateTo({ url: '/pages/settings/account-cancel' })} hoverClass="settings-hover">
        <Text>注销账号</Text>
      </View>

      <SettingsDialog
        open={logoutDialogOpen}
        title="提示"
        cancelText="取消"
        confirmText="确认"
        loading={loggingOut}
        onCancel={() => setLogoutDialogOpen(false)}
        onConfirm={() => void confirmLogout()}
      >
        <Text className="settings-logout-copy">确定要退出登录？</Text>
      </SettingsDialog>
    </SettingsShell>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error || '加载失败，请稍后重试')
  await Taro.showToast({ title, icon: 'none' })
}
