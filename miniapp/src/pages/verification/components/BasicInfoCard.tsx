import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { FieldRow } from './VerificationShell'
import type { LoginUserInfo } from '@/types/login'

interface BasicInfoCardProps {
  userInfo: LoginUserInfo
}

export default function BasicInfoCard({ userInfo }: BasicInfoCardProps) {
  const region = `${formatRegion(userInfo.province || '浙江')}-${formatRegion(userInfo.city || '杭州')}`

  return (
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
      <FieldRow label="昵称" value={userInfo.nickname || '用户8865'} />
      <FieldRow label="性别" value={userInfo.gender === 'male' ? '男' : '女'} />
      <FieldRow label="出生日期" value="1997/03/06 双鱼座" />
      <FieldRow label="学历" value={userInfo.education || '本科'} />
      <FieldRow label="现居地" value={region} />
      <FieldRow
        label="身高/体重"
        value={`${userInfo.height || '163cm'}/${userInfo.weight || '45kg'}`}
        onClick={() => Taro.navigateTo({ url: '/pages/verification/height-weight' })}
      />
      <FieldRow
        label="家乡"
        value={userInfo.hometown || '河南郑州'}
        onClick={() => Taro.navigateTo({ url: '/pages/verification/hometown' })}
      />
      <FieldRow label="身份" value="职场人" />
      <FieldRow
        label="职业"
        value={userInfo.career || '设计师'}
        onClick={() => Taro.navigateTo({ url: '/pages/verification/career' })}
      />
      <FieldRow
        label="年收入"
        value={userInfo.income || '15-30W'}
        onClick={() => Taro.navigateTo({ url: '/pages/verification/income' })}
      />
      <FieldRow label="婚姻状况" value="未婚" last />
    </View>
  )
}

function formatRegion(value: string) {
  return value.replace(/[省市区县]$/u, '')
}
