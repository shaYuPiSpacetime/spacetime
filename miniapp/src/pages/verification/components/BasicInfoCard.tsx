import { Input, Text, View } from '@tarojs/components'
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
import { LanhuDateSheet, LanhuDualColumnSheet, LanhuOptionSheet } from './LanhuPickerSheet'
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
  mode?: 'verification' | 'profileEdit'
}

const PICKER_HINTS: Record<EditableField, string> = {
  nickname: '可修改',
  gender: '已选择',
  birthday: '含星座',
  location: '现居地',
  'height-weight': '必填',
  hometown: '可选择',
  identity: '可选择',
  education: '可选择',
  career: '可选择',
  income: '可选择',
  maritalStatus: '可选择',
}

export default function BasicInfoCard({ userInfo, mode = 'verification' }: BasicInfoCardProps) {
  const { updateUserInfo } = useLogin()
  const [editingField, setEditingField] = useState<EditableField | null>(null)

  const region = formatLocation(userInfo)
  const height = userInfo.height || '163cm'
  const weight = userInfo.weight || '45kg'
  const birthday = userInfo.birthday || '1997/03/06'

  const handleConfirm = (patch: Partial<LoginUserInfo>) => {
    updateUserInfo(patch)
    setEditingField(null)
  }

  if (mode === 'profileEdit') {
    return (
      <>
        <View
          style={{
            position: 'absolute',
            left: '25rpx',
            top: '226rpx',
            width: '700rpx',
            minHeight: '808rpx',
            borderRadius: '16rpx',
            background: '#FFFFFF',
            padding: '18rpx 25rpx',
            boxSizing: 'border-box',
          }}
        >
          <FieldRow label="昵称" value={renderPlainValue(userInfo.nickname || '用户8865')} onClick={() => setEditingField('nickname')} />
          <FieldRow label="性别" value={renderPlainValue(formatGender(userInfo.gender))} onClick={() => setEditingField('gender')} />
          <FieldRow label="出生日期" value={renderPlainValue(`${birthday} ${getZodiac(birthday)}`)} onClick={() => setEditingField('birthday')} />
          <FieldRow label="现居地" value={renderPlainValue(region)} onClick={() => setEditingField('location')} />
          <FieldRow label="身高/体重" value={renderPlainValue(`${height}/${weight}`)} onClick={() => setEditingField('height-weight')} />
          <FieldRow label="家乡" value={renderPlainValue(userInfo.hometown || '河南郑州')} onClick={() => setEditingField('hometown')} />
          <FieldRow label="身份" value={renderPlainValue(userInfo.identity || '职场人')} onClick={() => setEditingField('identity')} />
          <FieldRow label="婚姻状况" value={renderPlainValue(userInfo.maritalStatus || '未婚')} onClick={() => setEditingField('maritalStatus')} last />
        </View>

        <View
          style={{
            position: 'absolute',
            left: '25rpx',
            top: '1056rpx',
            width: '700rpx',
            minHeight: '604rpx',
            borderRadius: '16rpx',
            background: '#FFFFFF',
            padding: '18rpx 25rpx',
            boxSizing: 'border-box',
          }}
        >
          <FieldRow label="毕业院校" value={renderPlainValue(userInfo.schoolName || '浙江工商大学')} onClick={() => setEditingField('education')} />
          <FieldRow label="最高学历" value={renderPlainValue(userInfo.educationLevel || userInfo.education || '本科')} onClick={() => setEditingField('education')} />
          <FieldRow label="行业" value={renderPlainValue('IT/互联网')} onClick={() => setEditingField('career')} />
          <FieldRow label="职业" value={renderPlainValue(userInfo.career || '设计师')} onClick={() => setEditingField('career')} />
          <FieldRow label="公司" value={renderPlainValue('163cm/45kg')} onClick={() => setEditingField('career')} />
          <FieldRow label="年薪" value={renderPlainValue(userInfo.income || '15-30W')} onClick={() => setEditingField('income')} last />
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

  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '558rpx',
          width: '700rpx',
          minHeight: '1068rpx',
          borderRadius: '24rpx',
          background: '#FFFFFF',
          padding: '18rpx 28rpx',
          boxSizing: 'border-box',
          boxShadow: '0 12rpx 30rpx rgba(11, 38, 90, 0.06)',
        }}
      >
        <FieldRow label="昵称" value={renderPickerHint(userInfo.nickname || '用户8865', PICKER_HINTS.nickname)} onClick={() => setEditingField('nickname')} />
        <FieldRow label="性别" value={renderPickerHint(formatGender(userInfo.gender), PICKER_HINTS.gender)} onClick={() => setEditingField('gender')} />
        <FieldRow label="出生日期" value={renderPickerHint(`${userInfo.birthday || '1997/03/06'} ${getZodiac(userInfo.birthday || '1997/03/06')}`, PICKER_HINTS.birthday)} onClick={() => setEditingField('birthday')} />
        <FieldRow label="现居地" value={renderPickerHint(region, PICKER_HINTS.location)} onClick={() => setEditingField('location')} />
        <FieldRow label="身高/体重" value={renderPickerHint(`${height}/${weight}`, PICKER_HINTS['height-weight'])} onClick={() => setEditingField('height-weight')} />
        <FieldRow label="家乡" value={renderPickerHint(userInfo.hometown || '河南郑州', PICKER_HINTS.hometown)} onClick={() => setEditingField('hometown')} />
        <FieldRow label="身份" value={renderPickerHint(userInfo.identity || '职场人', PICKER_HINTS.identity)} onClick={() => setEditingField('identity')} />
        <FieldRow label="学历" value={renderPickerHint(userInfo.education || '本科', PICKER_HINTS.education)} onClick={() => setEditingField('education')} />
        <FieldRow label="职业" value={renderPickerHint(userInfo.career || '设计师', PICKER_HINTS.career)} onClick={() => setEditingField('career')} />
        <FieldRow label="年收入" value={renderPickerHint(userInfo.income || '15-30W', PICKER_HINTS.income)} onClick={() => setEditingField('income')} />
        <FieldRow label="婚姻状况" value={renderPickerHint(userInfo.maritalStatus || '未婚', PICKER_HINTS.maritalStatus)} onClick={() => setEditingField('maritalStatus')} last />
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

function renderPlainValue(value: string) {
  return <Text style={{ color: '#999999', fontSize: '28rpx', lineHeight: '40rpx' }}>{value}</Text>
}

function renderPickerHint(value: string, hint: string) {
  return (
    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      <Text style={{ color: '#0C285A', fontSize: '26rpx', fontWeight: 700, lineHeight: '38rpx' }}>{value}</Text>
      <View
        style={{
          height: '42rpx',
          borderRadius: '24rpx',
          background: '#F6F9FE',
          padding: '0 16rpx',
          marginLeft: '12rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#2876FF', fontSize: '22rpx', fontWeight: 600, lineHeight: '31rpx' }}>{hint}</Text>
      </View>
    </View>
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
  return (
    <LanhuDateSheet
      title="出生日期"
      value={value}
      onConfirm={(birthday) => onConfirm({ birthday })}
      onClose={onClose}
    />
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
  const height = HEIGHTS[indexOfOrDefault(HEIGHTS, userInfo.height || '163cm', 13)]
  const weight = WEIGHTS[indexOfOrDefault(WEIGHTS, userInfo.weight || '45kg', 5)]

  return (
    <LanhuDualColumnSheet
      title="身高/体重"
      leftLabel="身高(cm)"
      leftOptions={HEIGHTS}
      leftValue={height}
      rightLabel="体重(kg)"
      rightOptions={WEIGHTS}
      rightValue={weight}
      onConfirm={(nextHeight, nextWeight) => onConfirm({ height: nextHeight, weight: nextWeight })}
      onClose={onClose}
    />
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
  return (
    <LanhuOptionSheet
      title={title}
      options={range}
      value={value}
      onConfirm={(selected) => onConfirm(toPatch(field, selected))}
      onClose={onClose}
    />
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
