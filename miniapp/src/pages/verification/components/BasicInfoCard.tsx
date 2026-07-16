import { Input, Text, View } from '@tarojs/components'
import { useMemo, useState } from 'react'
import type {
  BasicProfile,
  DictOption,
  ProfileFieldSetting,
  ProfileOptionKey,
  ProfileOptions,
  RegionOption,
} from '@/types/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import { BottomPicker, FieldRow } from './VerificationShell'
import { LanhuDateSheet, LanhuOptionSheet } from './LanhuPickerSheet'

type EditorState = {
  setting: ProfileFieldSetting
  options: Array<{ code: string; label: string }>
} | null

interface BasicInfoCardProps {
  userInfo: BasicProfile
  fieldSettings: ProfileFieldSetting[]
  profileOptions?: ProfileOptions
  regionOptions?: Record<string, RegionOption[]>
  mode?: 'verification' | 'profileEdit'
  onChange: (fieldId: string, value: unknown) => void | Promise<void>
}

const FIELD_OPTION_KEYS: Partial<Record<string, ProfileOptionKey>> = {
  gender: 'gender',
  identity: 'identity',
  educationLevel: 'educationLevel',
  industry: 'industry',
  occupation: 'occupation',
  annualIncome: 'annualIncome',
  maritalStatus: 'maritalStatus',
}

const REGION_FIELD_IDS = new Set([
  'locationProvince',
  'locationCity',
  'locationDistrict',
  'hometownProvince',
  'hometownCity',
  'hometownDistrict',
])

/**
 * 基本资料卡片：字段显隐、标签、范围和枚举均来自运行时接口。
 * 固定的仅是蓝湖布局；字段、枚举和交互文案均由运行时接口提供。
 */
export default function BasicInfoCard({
  userInfo,
  fieldSettings,
  profileOptions,
  regionOptions = {},
  mode = 'verification',
  onChange,
}: BasicInfoCardProps) {
  const copy = usePrd01Store(state => state.copy)
  const [editor, setEditor] = useState<EditorState>(null)
  const visibleSettings = useMemo(
    () => fieldSettings.filter(setting => setting.visible && setting.editable !== false),
    [fieldSettings]
  )
  const splitIndex = Math.min(8, visibleSettings.length)
  const primary = visibleSettings.slice(0, splitIndex)
  const secondary = visibleSettings.slice(splitIndex)
  const selectPlaceholder = copy('common_select_placeholder')
  const inputPlaceholder = copy('common_input_placeholder')

  const openEditor = (setting: ProfileFieldSetting) => {
    const optionKey = FIELD_OPTION_KEYS[setting.fieldId]
    const dictionaryOptions = optionKey ? profileOptions?.[optionKey] || [] : []
    const locationOptions = REGION_FIELD_IDS.has(setting.fieldId) ? regionOptions[setting.fieldId] || [] : []
    const numericOptions = setting.fieldType === 'number' ? buildNumericOptions(setting) : []
    setEditor({ setting, options: dictionaryOptions.length ? dictionaryOptions : locationOptions.length ? locationOptions : numericOptions })
  }

  const renderRows = (settings: ProfileFieldSetting[]) => settings.map((setting, index) => (
    <FieldRow
      key={setting.fieldId}
      label={setting.label || setting.fieldId}
      value={renderValue(
        resolveValueLabel(
          setting,
          userInfo[setting.fieldId],
          profileOptions,
          regionOptions,
          resolveFieldPlaceholder(setting, selectPlaceholder, inputPlaceholder)
        ),
        resolveFieldPlaceholder(setting, selectPlaceholder, inputPlaceholder)
      )}
      onClick={() => openEditor(setting)}
      last={index === settings.length - 1}
    />
  ))

  return (
    <>
      {mode === 'profileEdit' ? (
        <>
          <View style={profileCardStyle('226rpx', primary.length)}>
            {renderRows(primary)}
          </View>
          {secondary.length ? (
            <View style={profileCardStyle('1056rpx', secondary.length)}>
              {renderRows(secondary)}
            </View>
          ) : null}
        </>
      ) : (
        <View style={verificationCardStyle(visibleSettings.length)}>
          {renderRows(visibleSettings)}
        </View>
      )}

      {editor ? (
        <RuntimeFieldEditor
          setting={editor.setting}
          value={userInfo[editor.setting.fieldId]}
          options={editor.options}
          placeholder={resolveFieldPlaceholder(editor.setting, selectPlaceholder, inputPlaceholder)}
          onConfirm={async value => {
            await onChange(editor.setting.fieldId, value)
            setEditor(null)
          }}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </>
  )
}

function RuntimeFieldEditor({
  setting,
  value,
  options,
  placeholder,
  onConfirm,
  onClose,
}: {
  setting: ProfileFieldSetting
  value: unknown
  options: Array<{ code: string; label: string }>
  placeholder: string
  onConfirm: (value: unknown) => void | Promise<void>
  onClose: () => void
}) {
  const title = setting.label || setting.fieldId

  if (setting.fieldType === 'date') {
    return (
      <LanhuDateSheet
        title={title}
        value={String(value || '')}
        onConfirm={next => void onConfirm(next.replace(/\//g, '-'))}
        onClose={onClose}
      />
    )
  }

  if (options.length) {
    const current = options.find(option => option.code === String(value || ''))
    return (
      <LanhuOptionSheet
        title={title}
        options={options.map(option => option.label)}
        value={current?.label || ''}
        onConfirm={label => {
          const option = options.find(item => item.label === label)
          if (option) void onConfirm(option.code)
        }}
        onClose={onClose}
      />
    )
  }

  return (
    <TextFieldEditor
      title={title}
      value={value == null ? '' : String(value)}
      maxlength={setting.maxLength}
      number={setting.fieldType === 'number'}
      placeholder={placeholder}
      onConfirm={next => void onConfirm(setting.fieldType === 'number' && next ? Number(next) : next)}
      onClose={onClose}
    />
  )
}

function TextFieldEditor({
  title,
  value,
  maxlength,
  number,
  placeholder,
  onConfirm,
  onClose,
}: {
  title: string
  value: string
  maxlength?: number
  number: boolean
  placeholder: string
  onConfirm: (value: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(value)
  return (
    <BottomPicker title={title} onConfirm={() => onConfirm(draft.trim())} onClose={onClose}>
      <View style={{ height: '94rpx', borderBottom: '1rpx solid #EAF0F8', display: 'flex', alignItems: 'center', marginTop: '38rpx' }}>
        <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 700 }}>{title}</Text>
        <Input
          type={number ? 'number' : 'text'}
          value={draft}
          maxlength={maxlength || 100}
          placeholder={placeholder}
          placeholderStyle="color:#A8B2C4;font-size:28rpx"
          onInput={event => {
            setDraft(event.detail.value)
            return event.detail.value
          }}
          style={{ flex: 1, height: '94rpx', color: '#0C285A', fontSize: '28rpx', textAlign: 'right' }}
        />
      </View>
    </BottomPicker>
  )
}

function resolveValueLabel(
  setting: ProfileFieldSetting,
  value: unknown,
  profileOptions?: ProfileOptions,
  regionOptions: Record<string, RegionOption[]> = {},
  placeholder = ''
) {
  if (value == null || value === '') return placeholder
  const code = String(value)
  const optionKey = FIELD_OPTION_KEYS[setting.fieldId]
  if (optionKey) {
    return (profileOptions?.[optionKey] as DictOption[] | undefined)?.find(option => option.code === code)?.label || code
  }
  if (REGION_FIELD_IDS.has(setting.fieldId)) {
    return regionOptions[setting.fieldId]?.find(option => option.code === code)?.label || code
  }
  return code
}

function buildNumericOptions(setting: ProfileFieldSetting) {
  if (setting.minValue == null || setting.maxValue == null || setting.maxValue < setting.minValue) return []
  const size = setting.maxValue - setting.minValue + 1
  if (size > 300) return []
  return Array.from({ length: size }, (_, index) => {
    const value = String((setting.minValue || 0) + index)
    return { code: value, label: value }
  })
}

function resolveFieldPlaceholder(
  setting: ProfileFieldSetting,
  selectPlaceholder: string,
  inputPlaceholder: string
) {
  const isSelection = Boolean(FIELD_OPTION_KEYS[setting.fieldId])
    || REGION_FIELD_IDS.has(setting.fieldId)
    || setting.fieldType === 'date'
    || setting.fieldType === 'dict'
    || setting.fieldType === 'select'
  return isSelection ? selectPlaceholder : inputPlaceholder
}

function renderValue(value: string, placeholder: string) {
  return <Text style={{ color: value === placeholder ? '#B5BAC7' : '#999999', fontSize: '28rpx', lineHeight: '40rpx' }}>{value}</Text>
}

function profileCardStyle(top: string, rowCount: number) {
  return {
    position: 'absolute',
    left: '25rpx',
    top,
    width: '700rpx',
    minHeight: `${Math.max(rowCount, 1) * 94 + 36}rpx`,
    borderRadius: '16rpx',
    background: '#FFFFFF',
    padding: '18rpx 25rpx',
    boxSizing: 'border-box',
  } as const
}
function verificationCardStyle(rowCount: number) {
  return {
    position: 'absolute',
    left: '25rpx',
    top: '558rpx',
    width: '700rpx',
    minHeight: `${Math.max(rowCount, 1) * 94 + 36}rpx`,
    borderRadius: '24rpx',
    background: '#FFFFFF',
    padding: '18rpx 28rpx',
    boxSizing: 'border-box',
    boxShadow: '0 12rpx 30rpx rgba(11, 38, 90, 0.06)',
  } as const
}
