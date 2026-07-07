import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import VerificationShell from './VerificationShell'
import BasicInfoCard from './BasicInfoCard'
import { LanhuDualColumnSheet, LanhuOptionSheet } from './LanhuPickerSheet'
import { CAREERS, HEIGHTS, HOMETOWNS, INCOMES, WEIGHTS } from '../flow'

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

  return (
    <VerificationShell stage="basic" primaryText="继续认证" onPrimary={() => Taro.redirectTo({ url: '/pages/verification/avatar' })} scroll>
      <BasicInfoCard userInfo={userInfo} />
      {kind === 'height-weight' ? (
        <LanhuDualColumnSheet
          title={pickerTitle(kind)}
          leftLabel="身高(cm)"
          leftOptions={HEIGHTS}
          leftValue={HEIGHTS[heightIndex]}
          rightLabel="体重(kg)"
          rightOptions={WEIGHTS}
          rightValue={WEIGHTS[weightIndex]}
          onConfirm={(nextHeight, nextWeight) => {
            setHeightIndex(indexOfOrDefault(HEIGHTS, nextHeight, heightIndex))
            setWeightIndex(indexOfOrDefault(WEIGHTS, nextWeight, weightIndex))
            updateUserInfo({ height: nextHeight, weight: nextWeight })
            Taro.navigateBack()
          }}
          onClose={() => Taro.navigateBack()}
        />
      ) : (
        <LanhuOptionSheet
          title={pickerTitle(kind)}
          options={pickerRange(kind as SinglePickerKind)}
          value={pickerRange(kind as SinglePickerKind)[singleIndex]}
          onConfirm={(selected) => {
            setSingleIndex(indexOfOrDefault(pickerRange(kind as SinglePickerKind), selected, singleIndex))
            const patch: Partial<LoginUserInfo> = {}
            if (kind === 'hometown') patch.hometown = selected
            if (kind === 'career') patch.career = selected
            if (kind === 'income') patch.income = selected
            updateUserInfo(patch)
            Taro.navigateBack()
          }}
          onClose={() => Taro.navigateBack()}
        />
      )}
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

function indexOfOrDefault(list: string[], value: string, fallback: number) {
  const index = list.indexOf(value)
  return index >= 0 ? index : fallback
}
