import { Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import VerificationShell, { BottomPicker } from './VerificationShell'
import BasicInfoCard from './BasicInfoCard'
import { CAREERS, HEIGHTS, HOMETOWNS, INCOMES, WEIGHTS } from '../flow'
import type { LoginUserInfo } from '@/types/login'

type BasicPickerKind = 'height-weight' | 'hometown' | 'career' | 'income'
type SinglePickerKind = Exclude<BasicPickerKind, 'height-weight'>

interface BasicPickerPageProps {
  kind: BasicPickerKind
}

export default function BasicPickerPage({ kind }: BasicPickerPageProps) {
  const { userInfo, updateUserInfo } = useLogin()
  const [heightIndex, setHeightIndex] = useState(13)
  const [weightIndex, setWeightIndex] = useState(5)
  const [singleIndex, setSingleIndex] = useState(defaultSingleIndex(kind))

  const handleConfirm = () => {
    const patch: Partial<LoginUserInfo> = {}
    if (kind === 'height-weight') {
      patch.height = HEIGHTS[heightIndex]
      patch.weight = WEIGHTS[weightIndex]
    }
    if (kind === 'hometown') patch.hometown = HOMETOWNS[singleIndex]
    if (kind === 'career') patch.career = CAREERS[singleIndex]
    if (kind === 'income') patch.income = INCOMES[singleIndex]
    updateUserInfo(patch)
    Taro.navigateBack()
  }

  return (
    <VerificationShell stage="basic" primaryText="继续认证" onPrimary={() => Taro.navigateTo({ url: '/pages/verification/avatar' })} scroll>
      <BasicInfoCard userInfo={userInfo} />
      <BottomPicker title={pickerTitle(kind)} onConfirm={handleConfirm} onClose={() => Taro.navigateBack()}>
        {kind === 'height-weight' ? (
          <View style={{ marginTop: '38rpx' }}>
            <Picker mode="selector" range={HEIGHTS} value={heightIndex} onChange={(event) => setHeightIndex(Number(event.detail.value))}>
              <PickerLine label="身高(cm)" value={HEIGHTS[heightIndex].replace('cm', '')} />
            </Picker>
            <Picker mode="selector" range={WEIGHTS} value={weightIndex} onChange={(event) => setWeightIndex(Number(event.detail.value))}>
              <PickerLine label="体重(kg)" value={WEIGHTS[weightIndex].replace('kg', '')} />
            </Picker>
          </View>
        ) : (
          <Picker mode="selector" range={pickerRange(kind as SinglePickerKind)} value={singleIndex} onChange={(event) => setSingleIndex(Number(event.detail.value))}>
            <PickerLine label={pickerTitle(kind)} value={pickerRange(kind as SinglePickerKind)[singleIndex]} />
          </Picker>
        )}
      </BottomPicker>
    </VerificationShell>
  )
}

function defaultSingleIndex(kind: BasicPickerKind) {
  if (kind === 'career') return 3
  if (kind === 'income') return 2
  return 1
}

function pickerTitle(kind: BasicPickerKind) {
  if (kind === 'height-weight') return '身高/体重'
  if (kind === 'hometown') return '家乡'
  if (kind === 'career') return '职业'
  return '年收入'
}

function pickerRange(kind: SinglePickerKind) {
  if (kind === 'hometown') return HOMETOWNS
  if (kind === 'career') return CAREERS
  return INCOMES
}

function PickerLine({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        height: '94rpx',
        borderBottom: '1rpx solid #EAF0F8',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
      hoverClass="btn-hover"
    >
      <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}>{label}</Text>
      <View style={{ flex: 1, textAlign: 'right' }}>
        <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}>{value}</Text>
      </View>
    </View>
  )
}
