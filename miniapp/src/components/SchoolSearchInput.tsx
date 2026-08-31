import { Input, Text, View } from '@tarojs/components'
import { useEffect, useRef, useState } from 'react'
import { prd01Api } from '@/services/prd01'
import type { SchoolOption } from '@/types/prd01'

interface SchoolSearchInputProps {
  value: string
  placeholder: string
  label?: string
  marginTop?: string
  onChange: (name: string, code?: string) => void
}

/** 中国大陆高校联想搜索；未选择候选时保留手动输入名称并清空 code。 */
export default function SchoolSearchInput({
  value,
  placeholder,
  label,
  marginTop = '20rpx',
  onChange,
}: SchoolSearchInputProps) {
  const [options, setOptions] = useState<SchoolOption[]>([])
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    const keyword = value.trim()
    if (keyword.length < 2) {
      setOptions([])
      return
    }
    const currentId = ++requestId.current
    const timer = setTimeout(() => {
      setLoading(true)
      void prd01Api.searchSchools(keyword, 10)
        .then(result => {
          if (requestId.current === currentId) setOptions(result)
        })
        .catch(() => {
          if (requestId.current === currentId) setOptions([])
        })
        .finally(() => {
          if (requestId.current === currentId) setLoading(false)
        })
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <View style={{ position: 'relative', marginTop }}>
      <View style={{ minHeight: '88rpx', borderRadius: '12rpx', background: '#FCFCFC', padding: '0 26rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
        {label ? <Text style={{ color: '#0C285A', fontSize: '26rpx', fontWeight: 600, lineHeight: '37rpx', width: '220rpx' }}>{label}</Text> : null}
        <Input
          value={value}
          maxlength={100}
          placeholder={placeholder}
          placeholderStyle="color:#999999;font-size:24rpx;text-align:right"
          onInput={event => {
            onChange(event.detail.value, undefined)
            return event.detail.value
          }}
          style={{ flex: 1, color: '#333333', fontSize: '25rpx', textAlign: 'right' }}
        />
      </View>
      {loading ? <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', padding: '12rpx 26rpx 0', textAlign: 'right' }}>搜索中...</Text> : null}
      {options.length ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: '92rpx', zIndex: 30, borderRadius: '12rpx', background: '#FFFFFF', boxShadow: '0 10rpx 30rpx rgba(12,40,90,0.16)', overflow: 'hidden' }}>
          {options.map(option => (
            <View
              key={option.code}
              style={{ minHeight: '80rpx', padding: '14rpx 24rpx', borderBottom: '1rpx solid #EEF2F8', boxSizing: 'border-box' }}
              onClick={() => {
                onChange(option.name, option.code)
                setOptions([])
              }}
            >
              <Text style={{ display: 'block', color: '#0C285A', fontSize: '25rpx', lineHeight: '34rpx' }}>{option.name}</Text>
              <Text style={{ display: 'block', color: '#999999', fontSize: '20rpx', lineHeight: '28rpx' }}>{[option.province, option.city, option.shortName].filter(Boolean).join(' · ')}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
