import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { settingsApi } from '@/services/settings'
import { useAuthStore } from '@/stores/authStore'
import type { SettingsHome } from '@/types/settings'
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
    <Button className={`settings-row ${divider ? 'has-divider' : ''}`} onClick={onClick} hoverClass={onClick ? 'settings-hover' : 'none'}>
      <Text className="settings-row__label">{label}</Text>
      {value ? <Text className="settings-row__value">{value}</Text> : null}
      {arrow ? <Arrow /> : null}
    </Button>
  )
}

export default function SettingsPage() {
  const [home, setHome] = useState<SettingsHome>()
  const [loading, setLoading] = useState(true)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [copyConfig, setCopyConfig] = useState<Record<string, string>>({})

  useEffect(() => {
    void loadHome()
  }, [])

  async function loadHome() {
    setLoading(true)
    try {
      const [homeResult, copyResult] = await Promise.all([
        settingsApi.home(),
        settingsApi.publicConfig([
          'settings.loading_text',
          'settings.bound_text',
          'settings.unbound_text',
          'settings.logout_dialog_title',
          'settings.logout_dialog_copy',
          'settings.logout_cancel',
          'settings.logout_confirm',
          'settings.load_failed_text',
        ]),
      ])
      setHome(homeResult)
      setCopyConfig(copyResult || {})
    } catch (error) {
      await showError(error, copyConfig['settings.load_failed_text'])
    } finally {
      setLoading(false)
    }
  }

  function openCompliance(contentCode: string, title: string) {
    void Taro.navigateTo({
      url: `/pages/settings/content?contentCode=${encodeURIComponent(contentCode)}&title=${encodeURIComponent(title)}`,
    })
  }

  async function confirmLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await settingsApi.logout()
      useAuthStore.getState().logout()
      setLogoutDialogOpen(false)
      await Taro.reLaunch({ url: '/pages/login/phone' })
    } catch (error) {
      await showError(error, copyConfig['settings.load_failed_text'])
    } finally {
      setLoggingOut(false)
    }
  }

  const phoneValue = loading
    ? copyConfig['settings.loading_text'] || ''
    : home?.phoneBindStatus === 'BOUND'
      ? home.maskedPhone || ''
      : copyConfig['settings.unbound_text'] || ''
  const wechatValue = loading
    ? copyConfig['settings.loading_text'] || ''
    : home?.wechatBindStatus === 'BOUND'
      ? copyConfig['settings.bound_text'] || ''
      : copyConfig['settings.unbound_text'] || ''

  return (
    <SettingsShell title="设置">
      <View className="settings-main-card">
        <SettingsRow label="手机号绑定" value={phoneValue} />
        <SettingsRow label="微信绑定" value={wechatValue} />
        <SettingsRow label="隐私设置" arrow onClick={() => void Taro.navigateTo({ url: '/pages/settings/privacy' })} />
        <SettingsRow label="第三方信息共享清单" arrow onClick={() => openCompliance('third_party_list', '第三方信息共享清单')} />
        <SettingsRow label="个人信息收集清单" arrow onClick={() => openCompliance('personal_info_list', '个人信息收集清单')} />
        <SettingsRow label="关于我们" arrow onClick={() => void Taro.navigateTo({ url: '/pages/settings/about' })} />
        <SettingsRow label="退出登录" arrow divider={false} onClick={() => setLogoutDialogOpen(true)} />
      </View>

      <SettingsDialog
        open={logoutDialogOpen}
        title={copyConfig['settings.logout_dialog_title'] || ''}
        cancelText={copyConfig['settings.logout_cancel'] || ''}
        confirmText={copyConfig['settings.logout_confirm'] || ''}
        loading={loggingOut}
        onCancel={() => setLogoutDialogOpen(false)}
        onConfirm={() => void confirmLogout()}
      >
        <Text className="settings-logout-copy">{copyConfig['settings.logout_dialog_copy'] || ''}</Text>
      </SettingsDialog>
    </SettingsShell>
  )
}

async function showError(error: unknown, fallback = '') {
  const title = error instanceof Error ? error.message : fallback
  await Taro.showToast({ title, icon: 'none' })
}
