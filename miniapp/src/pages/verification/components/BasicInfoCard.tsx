import { Input, Text, View } from '@tarojs/components'
import { useMemo, useState } from 'react'
import {
  BASIC_PROFILE_ROW_FIELDS,
  PROFILE_PRIMARY_ROW_IDS,
  PROFILE_SECONDARY_ROW_IDS,
  VERIFICATION_ROW_IDS,
  visibleProfileRows,
  type BasicProfileRowId,
} from '@/domain/basicProfilePresentation'
import { buildRegionPatch } from '@/domain/basicProfileRegion'
import { usePrd01Store } from '@/stores/prd01Store'
import type {
  BasicProfile,
  DictOption,
  ProfileFieldSetting,
  ProfileOptionKey,
  ProfileOptions,
  RegionTreeOption,
} from '@/types/prd01'
import { BottomPicker, FieldRow } from './VerificationShell'
import {
  LanhuDateSheet,
  LanhuDualColumnSheet,
  LanhuOptionSheet,
  LanhuRegionSheet,
} from './LanhuPickerSheet'

type EditorState =
  | {
      kind: 'field'
      setting: ProfileFieldSetting
      options: Array<{ code: string; label: string }>
    }
  | { kind: 'region'; rowId: 'location' | 'hometown'; title: string }
  | {
      kind: 'heightWeight'
      title: string
      height: ProfileFieldSetting
      weight: ProfileFieldSetting
    }
  | null

interface BasicInfoCardProps {
  userInfo: BasicProfile
  fieldSettings: ProfileFieldSetting[]
  profileOptions?: ProfileOptions
  regionTree?: RegionTreeOption[]
  mode?: 'verification' | 'profileEdit'
  onChange: (fieldId: string, value: unknown) => void | Promise<void>
  onChangeMany?: (patch: BasicProfile) => void | Promise<void>
  onEditorVisibilityChange?: (visible: boolean) => void
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

const COMPOSITE_ROW_LABELS: Partial<Record<BasicProfileRowId, string>> = {
  location: '现居地',
  heightWeight: '身高/体重',
  hometown: '家乡',
  school: '毕业院校',
}

const PROFILE_CARD_GAP_RPX = 24
const PROFILE_ROW_HEIGHT_RPX = 98
const PROFILE_CARD_VERTICAL_PADDING_RPX = 36

/**
 * 基本资料卡片：字段显隐、标签、范围和枚举均来自运行时接口。
 * 固定的仅是蓝湖业务行组合与视觉顺序；提交仍使用接口定义的原子字段。
 */
export default function BasicInfoCard({
  userInfo,
  fieldSettings,
  profileOptions,
  regionTree = [],
  mode = 'verification',
  onChange,
  onChangeMany,
  onEditorVisibilityChange,
}: BasicInfoCardProps) {
  const copy = usePrd01Store(state => state.copy)
  const loadDistricts = usePrd01Store(state => state.locations)
  const [editor, setEditor] = useState<EditorState>(null)
  const settingMap = useMemo(
    () => new Map(fieldSettings.map(setting => [setting.fieldId, setting])),
    [fieldSettings]
  )
  const primaryRows = useMemo(
    () => visibleProfileRows(PROFILE_PRIMARY_ROW_IDS, fieldSettings),
    [fieldSettings]
  )
  const secondaryRows = useMemo(
    () => identityScopedRows(
      visibleProfileRows(PROFILE_SECONDARY_ROW_IDS, fieldSettings),
      userInfo.identity
    ),
    [fieldSettings, userInfo.identity]
  )
  const verificationRows = useMemo(
    () => identityScopedRows(
      visibleProfileRows(VERIFICATION_ROW_IDS, fieldSettings),
      userInfo.identity
    ),
    [fieldSettings, userInfo.identity]
  )
  const selectPlaceholder = copy('common_select_placeholder')
  const inputPlaceholder = copy('common_input_placeholder')

  const setActiveEditor = (next: EditorState) => {
    setEditor(next)
    onEditorVisibilityChange?.(Boolean(next))
  }

  const closeEditor = () => setActiveEditor(null)

  const applyPatch = async (patch: BasicProfile) => {
    if (onChangeMany) {
      await onChangeMany(patch)
      return
    }
    for (const [fieldId, value] of Object.entries(patch)) await onChange(fieldId, value)
  }

  const openRow = (rowId: BasicProfileRowId) => {
    if (rowId === 'location' || rowId === 'hometown') {
      setActiveEditor({ kind: 'region', rowId, title: COMPOSITE_ROW_LABELS[rowId] || '' })
      return
    }

    if (rowId === 'heightWeight') {
      const height = settingMap.get('height')
      const weight = settingMap.get('weight')
      if (height && weight) {
        setActiveEditor({
          kind: 'heightWeight',
          title: COMPOSITE_ROW_LABELS.heightWeight || '',
          height,
          weight,
        })
        return
      }
    }

    const setting = rowSettings(rowId, settingMap).find(item => item.editable !== false)
    if (!setting) return
    const optionKey = FIELD_OPTION_KEYS[setting.fieldId]
    const dictionaryOptions = optionKey ? profileOptions?.[optionKey] || [] : []
    const numericOptions = setting.fieldType === 'number' ? buildNumericOptions(setting) : []
    setActiveEditor({
      kind: 'field',
      setting,
      options: dictionaryOptions.length ? dictionaryOptions : numericOptions,
    })
  }

  const renderRows = (rows: BasicProfileRowId[]) =>
    rows.map((rowId, index) => {
      const settings = rowSettings(rowId, settingMap)
      const editable = settings.some(setting => setting.editable !== false)
      const placeholder = rowPlaceholder(rowId, settings, selectPlaceholder, inputPlaceholder)
      const value = resolveRowValue(
        rowId,
        settings,
        userInfo,
        profileOptions,
        regionTree,
        placeholder
      )
      return (
        <FieldRow
          key={rowId}
          label={COMPOSITE_ROW_LABELS[rowId] || settings[0]?.label || rowId}
          value={renderValue(value, placeholder)}
          onClick={editable ? () => openRow(rowId) : undefined}
          last={index === rows.length - 1}
        />
      )
    })

  return (
    <>
      {mode === 'profileEdit' ? (
        <View
          data-role="profile-basic-cards"
          style={{ width: '750rpx', paddingTop: '226rpx', boxSizing: 'border-box' }}
        >
          <View style={profileCardStyle(primaryRows.length)}>{renderRows(primaryRows)}</View>
          {secondaryRows.length ? (
            <View
              style={{
                ...profileCardStyle(secondaryRows.length),
                marginTop: `${PROFILE_CARD_GAP_RPX}rpx`,
              }}
            >
              {renderRows(secondaryRows)}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={verificationCardStyle(verificationRows.length)}>
          {renderRows(verificationRows)}
        </View>
      )}

      {editor?.kind === 'field' ? (
        <RuntimeFieldEditor
          setting={editor.setting}
          value={userInfo[editor.setting.fieldId]}
          options={editor.options}
          placeholder={resolveFieldPlaceholder(editor.setting, selectPlaceholder, inputPlaceholder)}
          onConfirm={async value => {
            if (editor.setting.fieldId === 'identity' && String(value).toUpperCase() !== 'WORKER') {
              await applyPatch({ identity: String(value), occupation: '', annualIncome: '' })
            } else {
              await onChange(editor.setting.fieldId, value)
            }
            closeEditor()
          }}
          onClose={closeEditor}
        />
      ) : null}

      {editor?.kind === 'region' ? (
        <LanhuRegionSheet
          title={editor.title}
          regions={regionTree}
          provinceCode={String(userInfo[`${editor.rowId}Province`] || '')}
          cityCode={String(userInfo[`${editor.rowId}City`] || '')}
          districtCode=""
          includeDistrict={false}
          loadDistricts={loadDistricts}
          onConfirm={(provinceCode, cityCode, districtCode) => {
            void applyPatch(
              buildRegionPatch(editor.rowId, provinceCode, cityCode, districtCode)
            ).then(closeEditor)
          }}
          onClose={closeEditor}
        />
      ) : null}

      {editor?.kind === 'heightWeight' ? (
        <LanhuDualColumnSheet
          title={editor.title}
          leftLabel={editor.height.label || editor.height.fieldId}
          leftOptions={buildNumericOptions(editor.height).map(item => item.label)}
          leftValue={String(userInfo.height || '')}
          rightLabel={editor.weight.label || editor.weight.fieldId}
          rightOptions={buildNumericOptions(editor.weight).map(item => item.label)}
          rightValue={String(userInfo.weight || '')}
          onConfirm={(height, weight) => {
            void applyPatch({ height: Number(height), weight: Number(weight) }).then(closeEditor)
          }}
          onClose={closeEditor}
        />
      ) : null}
    </>
  )
}

/** 职业和年收入只属于职场人；身份未选或为在校生时不展示。 */
function identityScopedRows(rows: BasicProfileRowId[], identity: unknown) {
  if (String(identity || '').toUpperCase() === 'WORKER') return rows
  return rows.filter(rowId => rowId !== 'occupation' && rowId !== 'annualIncome')
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
      onConfirm={next =>
        void onConfirm(setting.fieldType === 'number' && next ? Number(next) : next)
      }
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
      <View
        style={{
          height: '94rpx',
          borderBottom: '1rpx solid #EAF0F8',
          display: 'flex',
          alignItems: 'center',
          marginTop: '38rpx',
        }}
      >
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
          style={{
            flex: 1,
            height: '94rpx',
            color: '#0C285A',
            fontSize: '28rpx',
            textAlign: 'right',
          }}
        />
      </View>
    </BottomPicker>
  )
}

function rowSettings(rowId: BasicProfileRowId, settingMap: Map<string, ProfileFieldSetting>) {
  return BASIC_PROFILE_ROW_FIELDS[rowId]
    .map(fieldId => settingMap.get(fieldId))
    .filter((setting): setting is ProfileFieldSetting => Boolean(setting?.visible))
}

function rowPlaceholder(
  rowId: BasicProfileRowId,
  settings: ProfileFieldSetting[],
  selectPlaceholder: string,
  inputPlaceholder: string
) {
  if (rowId === 'location' || rowId === 'hometown' || rowId === 'heightWeight')
    return selectPlaceholder
  return settings[0]
    ? resolveFieldPlaceholder(settings[0], selectPlaceholder, inputPlaceholder)
    : selectPlaceholder
}

function resolveRowValue(
  rowId: BasicProfileRowId,
  settings: ProfileFieldSetting[],
  userInfo: BasicProfile,
  profileOptions: ProfileOptions | undefined,
  regionTree: RegionTreeOption[],
  placeholder: string
) {
  if (rowId === 'location' || rowId === 'hometown') {
    return resolveRegionLabel(
      regionTree,
      String(userInfo[`${rowId}Province`] || ''),
      String(userInfo[`${rowId}City`] || ''),
      '',
      placeholder
    )
  }
  if (rowId === 'heightWeight') {
    if (!userInfo.height && !userInfo.weight) return placeholder
    return `${userInfo.height || '--'}cm/${userInfo.weight || '--'}kg`
  }
  if (rowId === 'birthday') {
    const birthday = String(userInfo.birthday || '')
    if (!birthday) return placeholder
    return [birthday.replace(/-/g, '/'), String(userInfo.zodiac || '')].filter(Boolean).join(' ')
  }
  const setting = settings[0]
  if (!setting) return placeholder
  return resolveValueLabel(setting, userInfo[setting.fieldId], profileOptions, placeholder)
}

function resolveValueLabel(
  setting: ProfileFieldSetting,
  value: unknown,
  profileOptions: ProfileOptions | undefined,
  placeholder: string
) {
  if (value == null || value === '') return placeholder
  const code = String(value)
  const optionKey = FIELD_OPTION_KEYS[setting.fieldId]
  if (optionKey) {
    return (
      (profileOptions?.[optionKey] as DictOption[] | undefined)?.find(
        option => option.code === code
      )?.label || code
    )
  }
  return code
}

function resolveRegionLabel(
  tree: RegionTreeOption[],
  provinceCode: string,
  cityCode: string,
  districtCode: string,
  placeholder: string
) {
  if (!provinceCode && !cityCode) return placeholder
  const province = tree.find(item => item.code === provinceCode)
  const city = province?.children.find(item => item.code === cityCode)
  const provinceLabel = trimRegionSuffix(province?.name || provinceCode)
  const cityLabel = trimRegionSuffix(city?.name || cityCode)
  const districtLabel = trimRegionSuffix(districtCode)
  if (!provinceLabel) return cityLabel || placeholder
  const provinceCityLabel =
    !cityLabel || provinceLabel === cityLabel ? provinceLabel : `${provinceLabel}-${cityLabel}`
  return districtLabel ? `${provinceCityLabel}-${districtLabel}` : provinceCityLabel
}

function trimRegionSuffix(value: string) {
  return value.replace(/[省市区县]$/u, '')
}

function buildNumericOptions(setting: ProfileFieldSetting) {
  if (setting.minValue == null || setting.maxValue == null || setting.maxValue < setting.minValue)
    return []
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
  const isSelection =
    Boolean(FIELD_OPTION_KEYS[setting.fieldId]) ||
    setting.fieldType === 'date' ||
    setting.fieldType === 'dict' ||
    setting.fieldType === 'select' ||
    setting.fieldType === 'region'
  return isSelection ? selectPlaceholder : inputPlaceholder
}

function renderValue(value: string, placeholder: string) {
  return (
    <Text
      style={{
        color: value === placeholder ? '#B5BAC7' : '#999999',
        fontSize: '28rpx',
        lineHeight: '40rpx',
      }}
    >
      {value}
    </Text>
  )
}

function profileCardHeight(rowCount: number) {
  return Math.max(rowCount, 1) * PROFILE_ROW_HEIGHT_RPX + PROFILE_CARD_VERTICAL_PADDING_RPX
}

function profileCardStyle(rowCount: number) {
  return {
    position: 'relative',
    marginLeft: '25rpx',
    width: '700rpx',
    minHeight: `${profileCardHeight(rowCount)}rpx`,
    borderRadius: '36rpx',
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
    minHeight: `${profileCardHeight(rowCount)}rpx`,
    borderRadius: '36rpx',
    background: '#FFFFFF',
    padding: '18rpx 28rpx',
    boxSizing: 'border-box',
    boxShadow: '0 12rpx 30rpx rgba(11, 38, 90, 0.06)',
  } as const
}
