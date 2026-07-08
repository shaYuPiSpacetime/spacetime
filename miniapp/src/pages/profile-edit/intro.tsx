import { ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { getDemoPageData } from '@/services/lanhuDemo'
import { navigateBackOrRedirect } from '@/utils/navigation'

type ProfileDemo = {
  editProfile: {
    intro: {
      title: string
      placeholder: string
      value: string
      limitText: string
    }
  }
}

const profileDemo = getDemoPageData('profile') as ProfileDemo
const mainBlue = '#2876FF'
const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)'

export default function ProfileEditIntroPage() {
  const intro = profileDemo.editProfile.intro
  const [value, setValue] = useState(intro.value)

  const handleBack = () => {
    navigateBackOrRedirect()
  }

  const handleSave = () => {
    Taro.showToast({ title: '已保存', icon: 'success' })
    setTimeout(handleBack, 500)
  }

  return (
    <View style={{ minHeight: '100vh', background: pageBackground }}>
      <LanhuSubNav title={intro.title || '自我介绍'} onBack={handleBack} />
      <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)', width: '750rpx' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '62rpx 25rpx 160rpx', boxSizing: 'border-box' }}>
          <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', lineHeight: '67rpx', fontWeight: 800 }}>
            自我介绍
          </Text>
          <Text style={{ display: 'block', color: '#999999', fontSize: '28rpx', lineHeight: '40rpx', marginTop: '28rpx' }}>
            介绍下自己的性格、习惯、有点、缺点
          </Text>
          <View
            style={{
              width: '700rpx',
              minHeight: '474rpx',
              borderRadius: '8rpx',
              background: '#FFFFFF',
              padding: '30rpx',
              boxSizing: 'border-box',
              marginTop: '74rpx',
            }}
          >
            <Textarea
              value={value}
              placeholder={intro.placeholder}
              placeholderStyle="color:#999999;font-size:28rpx;line-height:48rpx"
              maxlength={200}
              onInput={(event) => setValue(event.detail.value)}
              style={{
                width: '640rpx',
                minHeight: '366rpx',
                color: '#333333',
                fontSize: '28rpx',
                lineHeight: '48rpx',
                background: '#FFFFFF',
              }}
            />
            <Text style={{ display: 'block', color: '#999999', fontSize: '28rpx', lineHeight: '40rpx', textAlign: 'right' }}>
              最少20字
            </Text>
          </View>
          <View
            onClick={handleSave}
            style={{
              width: '700rpx',
              height: '98rpx',
              borderRadius: '49rpx',
              background: mainBlue,
              marginTop: '42rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: '36rpx', lineHeight: '50rpx', fontWeight: 500 }}>保存</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
