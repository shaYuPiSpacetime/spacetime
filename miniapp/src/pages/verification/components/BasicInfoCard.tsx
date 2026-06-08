import { Input, Picker, Text, View } from '@tarojs/components'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import {
  CAREERS,
  EDUCATIONS,
  GENDERS,
  HEIGHTS,
  HOMETOWNS,
  IDENTITIES,
  INCOMES,
  LOCATIONS,
  MARITAL_STATUSES,
  WEIGHTS,
} from '../flow'
import { BottomPicker, FieldRow } from './VerificationShell'
import type { LoginUserInfo } from '@/types/login'

type EditableField =
  | 'nickname'
  | 'gender'
  | 'birthday'
  | 'location'
  | 'height-weight'
  | 'hometown'
  | 'identity'
  | 'education'
  | 'career'
  | 'income'
  | 'maritalStatus'

interface BasicInfoCardProps {
  userInfo: LoginUserInfo
}

export default function BasicInfoCard({ userInfo }: BasicInfoCardProps) {
  const { updateUserInfo } = useLogin()
  const [editingField, setEditingField] = useState<EditableField | null>(null)

  const region = formatLocation(userInfo)
  const height = userInfo.height || '163cm'
  const weight = userInfo.weight || '45kg'

  const handleConfirm = (patch: Partial<LoginUserInfo>) => {
    updateUserInfo(patch)
    setEditingField(null)
  }

  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '558rpx',
          width: '700rpx',
          minHeight: '1068rpx',
          borderRadius: '18rpx',
          background: '#FFFFFF',
          padding: '22rpx 26rpx',
          boxSizing: 'border-box',
        }}
      >
        <FieldRow label="昵称" value={userInfo.nickname || '用户8865'} onClick={() => setEditingField('nickname')} />
        <FieldRow label="性别" value={formatGender(userInfo.gender)} onClick={() => setEditingField('gender')} />
        <FieldRow label="出生日期" value={`${userInfo.birthday || '1997/03/06'} ${getZodiac(userInfo.birthday || '1997/03/06')}`} onClick={() => setEditingField('birthday')} />
        <FieldRow label="现居地" value={region} onClick={() => setEditingField('location')} />
        <FieldRow label="身高/体重" value={`${height}/${weight}`} onClick={() => setEditingField('height-weight')} />
        <FieldRow label="家乡" value={userInfo.hometown || '河南郑州'} onClick={() => setEditingField('hometown')} />
        <FieldRow label="身份" value={userInfo.identity || '职场人'} onClick={() => setEditingField('identity')} />
        <FieldRow label="学历" value={userInfo.education || '本科'} onClick={() => setEditingField('education')} />
        <FieldRow label="职业" value={userInfo.career || '设计师'} onClick={() => setEditingField('career')} />
        <FieldRow label="年收入" value={userInfo.income || '15-30W'} onClick={() => setEditingField('income')} />
        <FieldRow label="婚姻状况" value={userInfo.maritalStatus || '未婚'} onClick={() => setEditingField('maritalStatus')} last />
      </View>

      {editingField && (
        <BasicFieldEditor
          field={editingField}
          userInfo={userInfo}
          onConfirm={handleConfirm}
          onClose={() => setEditingField(null)}
        />
      )}
    </>
  )
}

function BasicFieldEditor({
  field,
  userInfo,
  onConfirm,
  onClose,
}: {
  field: EditableField
  userInfo: LoginUserInfo
  onConfirm: (patch: Partial<LoginUserInfo>) => void
  onClose: () => void
}) {
  if (field === 'nickname') {
    return <NicknameEditor value={userInfo.nickname || '用户8865'} onConfirm={onConfirm} onClose={onClose} />
  }

  if (field === 'height-weight') {
    return <HeightWeightEditor userInfo={userInfo} onConfirm={onConfirm} onClose={onClose} />
  }

  if (field === 'birthday') {
    return <BirthdayEditor value={userInfo.birthday || '1997/03/06'} onConfirm={onConfirm} onClose={onClose} />
  }

  if (field === 'location') {
    return <SinglePickerEditor title="现居地" field={field} range={LOCATIONS} value={formatLocation(userInfo)} onConfirm={onConfirm} onClose={onClose} />
  }

  const config = singlePickerConfig(field, userInfo)
  return (
    <SinglePickerEditor
      title={config.title}
      field={field}
      range={config.range}
      value={config.value}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}

function NicknameEditor({
  value,
  onConfirm,
  onClose,
}: {
  value: string
  onConfirm: (patch: Partial<LoginUserInfo>) => void
  onClose: () => void
}) {
  const [nickname, setNickname] = useState(value)

  const handleConfirm = () => {
    const next = nickname.trim()
    onConfirm({ nickname: next || value })
  }

  return (
    <BottomPicker title="昵称" onConfirm={handleConfirm} onClose={onClose}>
      <View
        style={{
          height: '94rpx',
          borderBottom: '1rpx solid #EAF0F8',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: '38rpx',
        }}
      >
        <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}>昵称</Text>
        <Input
          value={nickname}
          maxlength={12}
          onInput={(event) => {
            setNickname(String(event.detail.value || ''))
            return event.detail.value
          }}
          style={{
            flex: 1,
            height: '94rpx',
            color: '#0C285A',
            fontSize: '28rpx',
            fontWeight: 700,
            lineHeight: '94rpx',
            textAlign: 'right',
          }}
        />
      </View>
    </BottomPicker>
  )
}

function BirthdayEditor({
  value,
  onConfirm,
  onClose,
}: {
  value: string
  onConfirm: (patch: Partial<LoginUserInfo>) => void
  onClose: () => void
}) {
  const [birthday, setBirthday] = useState(value.replace(/\//g, '-'))
  const normalizedBirthday = birthday.replace(/-/g, '/')

  return (
    <BottomPicker title="出生日期" onConfirm={() => onConfirm({ birthday: normalizedBirthday })} onClose={onClose}>
      <Picker
        mode="date"
        value={birthday}
        start="1970-01-01"
        end="2008-12-31"
        onChange={(event) => setBirthday(String(event.detail.value))}
      >
        <PickerLine label="出生日期" value={`${normalizedBirthday} ${getZodiac(normalizedBirthday)}`} />
      </Picker>
    </BottomPicker>
  )
}

function HeightWeightEditor({
  userInfo,
  onConfirm,
  onClose,
}: {
  userInfo: LoginUserInfo
  onConfirm: (patch: Partial<LoginUserInfo>) => void
  onClose: () => void
}) {
  const [heightIndex, setHeightIndex] = useState(indexOfOrDefault(HEIGHTS, userInfo.height || '163cm', 13))
  const [weightIndex, setWeightIndex] = useState(indexOfOrDefault(WEIGHTS, userInfo.weight || '45kg', 5))

  return (
    <BottomPicker
      title="身高/体重"
      onConfirm={() => onConfirm({ height: HEIGHTS[heightIndex], weight: WEIGHTS[weightIndex] })}
      onClose={onClose}
    >
      <View>
        <Picker mode="selector" range={HEIGHTS} value={heightIndex} onChange={(event) => setHeightIndex(Number(event.detail.value))}>
          <PickerLine label="身高(cm)" value={HEIGHTS[heightIndex].replace('cm', '')} />
        </Picker>
        <Picker mode="selector" range={WEIGHTS} value={weightIndex} onChange={(event) => setWeightIndex(Number(event.detail.value))}>
          <PickerLine label="体重(kg)" value={WEIGHTS[weightIndex].replace('kg', '')} compact />
        </Picker>
      </View>
    </BottomPicker>
  )
}

function SinglePickerEditor({
  title,
  field,
  range,
  value,
  onConfirm,
  onClose,
}: {
  title: string
  field: EditableField
  range: string[]
  value: string
  onConfirm: (patch: Partial<LoginUserInfo>) => void
  onClose: () => void
}) {
  const [index, setIndex] = useState(indexOfOrDefault(range, value, 0))
  const selected = range[index]

  return (
    <BottomPicker title={title} onConfirm={() => onConfirm(toPatch(field, selected))} onClose={onClose}>
      <Picker mode="selector" range={range} value={index} onChange={(event) => setIndex(Number(event.detail.value))}>
        <PickerLine label={title} value={selected} />
      </Picker>
    </BottomPicker>
  )
}

function PickerLine({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <View
      style={{
        height: '94rpx',
        borderBottom: '1rpx solid #EAF0F8',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: compact ? '0' : '38rpx',
      }}
    >
      <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}>{label}</Text>
      <View style={{ flex: 1, textAlign: 'right' }}>
        <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}>{value}</Text>
      </View>
    </View>
  )
}

function singlePickerConfig(field: EditableField, userInfo: LoginUserInfo) {
  if (field === 'gender') return { title: '性别', range: GENDERS, value: formatGender(userInfo.gender) }
  if (field === 'hometown') return { title: '家乡', range: HOMETOWNS, value: userInfo.hometown || '河南郑州' }
  if (field === 'identity') return { title: '身份', range: IDENTITIES, value: userInfo.identity || '职场人' }
  if (field === 'education') return { title: '学历', range: EDUCATIONS, value: userInfo.education || '本科' }
  if (field === 'career') return { title: '职业', range: CAREERS, value: userInfo.career || '设计师' }
  if (field === 'income') return { title: '年收入', range: INCOMES, value: userInfo.income || '15-30W' }
  return { title: '婚姻状况', range: MARITAL_STATUSES, value: userInfo.maritalStatus || '未婚' }
}

function toPatch(field: EditableField, value: string): Partial<LoginUserInfo> {
  if (field === 'gender') return { gender: value === '男' ? 'male' : 'female' }
  if (field === 'birthday') return { birthday: value }
  if (field === 'location') {
    const { province, city } = parseLocation(value)
    return { province, city }
  }
  if (field === 'hometown') return { hometown: value }
  if (field === 'identity') return { identity: value }
  if (field === 'education') return { education: value }
  if (field === 'career') return { career: value }
  if (field === 'income') return { income: value }
  if (field === 'maritalStatus') return { maritalStatus: value }
  return {}
}

function formatGender(gender?: LoginUserInfo['gender']) {
  return gender === 'male' ? '男' : '女'
}

function formatLocation(userInfo: LoginUserInfo) {
  const province = formatRegion(userInfo.province || '浙江')
  const city = formatRegion(userInfo.city || '杭州')
  return `${province}-${city}`
}

function parseLocation(value: string) {
  const compact = value.replace('-', '')
  const item = LOCATIONS.find((location) => location === compact) || LOCATIONS[0]
  if (item.startsWith('北京')) return { province: '北京', city: item.replace('北京', '') }
  if (item.startsWith('上海')) return { province: '上海', city: item.replace('上海', '') }
  if (item.startsWith('浙江')) return { province: '浙江', city: item.replace('浙江', '') }
  if (item.startsWith('江苏')) return { province: '江苏', city: item.replace('江苏', '') }
  if (item.startsWith('广东')) return { province: '广东', city: item.replace('广东', '') }
  return { province: item.slice(0, 2), city: item.slice(2) }
}

function indexOfOrDefault(list: string[], value: string, fallback: number) {
  const normalizedValue = value.replace('-', '')
  const index = list.findIndex((item) => item === value || item === normalizedValue)
  return index >= 0 ? index : fallback
}

function formatRegion(value: string) {
  return value.replace(/[省市区县]$/u, '')
}

function getZodiac(date: string) {
  const [, monthValue, dayValue] = date.replace(/-/g, '/').split('/').map(Number)
  const month = monthValue || 3
  const day = dayValue || 6
  const zodiacs: Array<[string, number]> = [
    ['摩羯座', 20],
    ['水瓶座', 19],
    ['双鱼座', 21],
    ['白羊座', 20],
    ['金牛座', 21],
    ['双子座', 22],
    ['巨蟹座', 23],
    ['狮子座', 23],
    ['处女座', 23],
    ['天秤座', 24],
    ['天蝎座', 23],
    ['射手座', 22],
    ['摩羯座', 32],
  ]
  return day < zodiacs[month - 1][1] ? zodiacs[month - 1][0] : zodiacs[month][0]
}
