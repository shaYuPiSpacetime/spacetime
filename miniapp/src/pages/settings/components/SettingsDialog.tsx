import { Text, View } from '@tarojs/components'
import type { ReactNode } from 'react'

interface SettingsDialogProps {
  open: boolean
  title: string
  children: ReactNode
  cancelText: string
  confirmText: string
  confirmDisabled?: boolean
  loading?: boolean
  variant?: 'compact' | 'cancel'
  onCancel: () => void
  onConfirm: () => void
}

export default function SettingsDialog({
  open,
  title,
  children,
  cancelText,
  confirmText,
  confirmDisabled = false,
  loading = false,
  variant = 'compact',
  onCancel,
  onConfirm,
}: SettingsDialogProps) {
  if (!open) return null
  return (
    <View className="settings-dialog-mask" catchMove role="presentation">
      <View className={`settings-dialog settings-dialog--${variant}`} role="dialog" aria-modal="true">
        <Text className="settings-dialog__title">{title}</Text>
        <View className="settings-dialog__body">{children}</View>
        <View className="settings-dialog__actions">
          <View className="settings-dialog__button settings-dialog__button--cancel" onClick={onCancel} hoverClass="settings-hover">
            <Text>{cancelText}</Text>
          </View>
          <View
            className={`settings-dialog__button settings-dialog__button--confirm ${confirmDisabled || loading ? 'is-disabled' : ''}`}
            onClick={() => !confirmDisabled && !loading && onConfirm()}
            hoverClass={confirmDisabled || loading ? 'none' : 'settings-hover'}
          >
            <Text>{loading ? '提交中' : confirmText}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
