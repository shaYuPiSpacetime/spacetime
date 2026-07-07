import { ScrollView, Text, View } from '@tarojs/components'
import { useState } from 'react'
import { BottomPicker } from './VerificationShell'

interface LanhuOptionSheetProps {
  title: string
  options: string[]
  value: string
  onConfirm: (value: string) => void
  onClose: () => void
}

interface LanhuDualColumnSheetProps {
  title: string
  leftLabel: string
  leftOptions: string[]
  leftValue: string
  rightLabel: string
  rightOptions: string[]
  rightValue: string
  onConfirm: (leftValue: string, rightValue: string) => void
  onClose: () => void
}

interface LanhuDateSheetProps {
  title: string
  value: string
  onConfirm: (value: string) => void
  onClose: () => void
}

const YEARS = Array.from({ length: 39 }, (_, index) => `${1970 + index}年`)
const MONTHS = Array.from({ length: 12 }, (_, index) => `${index + 1}月`)
const DAYS = Array.from({ length: 31 }, (_, index) => `${index + 1}日`)

export function LanhuOptionSheet({ title, options, value, onConfirm, onClose }: LanhuOptionSheetProps) {
  const [selected, setSelected] = useState(value || options[0])

  return (
    <BottomPicker title={title} onConfirm={() => onConfirm(selected)} onClose={onClose}>
      <View style={{ marginTop: '34rpx' }}>
        <OptionColumn label={title} options={options} value={selected} onChange={setSelected} />
      </View>
    </BottomPicker>
  )
}

export function LanhuDualColumnSheet({
  title,
  leftLabel,
  leftOptions,
  leftValue,
  rightLabel,
  rightOptions,
  rightValue,
  onConfirm,
  onClose,
}: LanhuDualColumnSheetProps) {
  const [leftSelected, setLeftSelected] = useState(leftValue || leftOptions[0])
  const [rightSelected, setRightSelected] = useState(rightValue || rightOptions[0])

  return (
    <BottomPicker title={title} onConfirm={() => onConfirm(leftSelected, rightSelected)} onClose={onClose}>
      <View style={{ marginTop: '34rpx', display: 'flex', flexDirection: 'row' }}>
        <OptionColumn label={leftLabel} options={leftOptions} value={leftSelected} onChange={setLeftSelected} />
        <View style={{ width: '20rpx' }} />
        <OptionColumn label={rightLabel} options={rightOptions} value={rightSelected} onChange={setRightSelected} />
      </View>
    </BottomPicker>
  )
}

export function LanhuDateSheet({ title, value, onConfirm, onClose }: LanhuDateSheetProps) {
  const parsed = parseDate(value)
  const [year, setYear] = useState(`${parsed.year}年`)
  const [month, setMonth] = useState(`${parsed.month}月`)
  const [day, setDay] = useState(`${parsed.day}日`)

  const handleConfirm = () => {
    const normalizedMonth = String(Number(month.replace('月', ''))).padStart(2, '0')
    const normalizedDay = String(Number(day.replace('日', ''))).padStart(2, '0')
    onConfirm(`${year.replace('年', '')}/${normalizedMonth}/${normalizedDay}`)
  }

  return (
    <BottomPicker title={title} onConfirm={handleConfirm} onClose={onClose}>
      <View style={{ marginTop: '34rpx', display: 'flex', flexDirection: 'row' }}>
        <OptionColumn label="年" options={YEARS} value={year} onChange={setYear} />
        <View style={{ width: '16rpx' }} />
        <OptionColumn label="月" options={MONTHS} value={month} onChange={setMonth} />
        <View style={{ width: '16rpx' }} />
        <OptionColumn label="日" options={DAYS} value={day} onChange={setDay} />
      </View>
    </BottomPicker>
  )
}

function OptionColumn({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ display: 'block', color: '#697E9C', fontSize: '24rpx', lineHeight: '34rpx', textAlign: 'center', marginBottom: '14rpx' }}>
        {label}
      </Text>
      <ScrollView
        scrollY
        showScrollbar={false}
        style={{
          height: '318rpx',
          borderRadius: '18rpx',
          background: '#F7FAFF',
          padding: '8rpx',
          boxSizing: 'border-box',
        }}
      >
        {options.map((option) => {
          const active = option === value
          return (
            <View
              key={option}
              style={{
                height: '74rpx',
                borderRadius: '12rpx',
                background: active ? '#E3F1FE' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '6rpx',
              }}
              onClick={() => onChange(option)}
              hoverClass="btn-hover"
            >
              <Text style={{ color: active ? '#2876FF' : '#333333', fontSize: active ? '30rpx' : '28rpx', fontWeight: active ? 800 : 500, lineHeight: '42rpx' }}>
                {option}
              </Text>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

function parseDate(value: string) {
  const [yearValue, monthValue, dayValue] = value.replace(/-/g, '/').split('/').map(Number)
  return {
    year: yearValue || 1997,
    month: monthValue || 3,
    day: dayValue || 6,
  }
}
