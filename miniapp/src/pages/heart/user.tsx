import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import HeartMessageHeader from '@/components/HeartMessageHeader'
import { miniappOssIcons } from '@/constants/ossIcons'

const background =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6) 100%)'

const tagRows = [
  ['IT女神', '户外发烧友', '热爱旅行', '电子竞技'],
  ['IT女神', '户外发烧友', '热爱旅行', '电子竞技'],
  ['IT女神', '户外发烧友', '热爱旅行', '电子竞技'],
]

const tagStyles = [
  { color: '#4CAF51', background: '#EBF5EA' },
  { color: '#3D9FF5', background: '#E7F2FE' },
  { color: '#FF9A0F', background: '#FFF3E6' },
  { color: '#9F2CB2', background: '#F4E6F6' },
]

export default function HeartUserPage() {
  const [liked, setLiked] = useState(false)
  const [matched] = useState(true)

  const toggleLike = () => {
    if (liked) {
      Taro.showModal({
        title: '取消喜欢',
        content: '取消后仅撤销爱心来源；若仍有其他匹配来源，聊天关系继续有效。',
        success: result => result.confirm && setLiked(false),
      })
      return
    }
    setLiked(true)
    Taro.showToast({ title: '已喜欢', icon: 'success' })
  }

  const openSafetyActions = () => {
    Taro.showActionSheet({
      itemList: ['举报该用户', '拉黑该用户'],
      success: result => Taro.showToast({ title: result.tapIndex === 0 ? '已进入举报流程' : '拉黑需再次确认', icon: 'none' }),
    })
  }
  return (
    <View style={{ height: '100vh', overflow: 'hidden', background, fontFamily: 'PingFang SC, sans-serif' }}>
      <ScrollView scrollY style={{ width: '750rpx', height: '100vh' }} showScrollbar={false}>
        <View style={{ minHeight: '1850rpx', paddingBottom: '150rpx', boxSizing: 'border-box' }}>
          <HeartMessageHeader title="用户主页" align="center" showBack />
          <View style={{ width: '700rpx', margin: '0 auto' }}>
            <View style={{ position: 'relative', width: '700rpx', height: '828rpx', overflow: 'hidden', borderRadius: '32rpx', background: '#D8E7E6' }}>
              <Image src={miniappOssIcons.profilePreviewHero} mode="scaleToFill" style={{ width: '700rpx', height: '828rpx' }} />
              <Image
                src={miniappOssIcons.profilePreviewShare}
                mode="scaleToFill"
                onClick={() => Taro.showShareMenu({ withShareTicket: true })}
                style={{ position: 'absolute', right: '30rpx', top: '28rpx', width: '48rpx', height: '48rpx', borderRadius: '50%' }}
              />
              <View onClick={openSafetyActions} style={{ position: 'absolute', left: '30rpx', top: '28rpx', zIndex: 4, padding: '10rpx 18rpx', borderRadius: '24rpx', background: 'rgba(0,0,0,0.28)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: '22rpx' }}>举报 · 拉黑</Text>
              </View>
              <Image src={miniappOssIcons.profilePreviewAvatar} mode="scaleToFill" style={{ position: 'absolute', left: '30rpx', bottom: '57rpx', zIndex: 3, width: '188rpx', height: '188rpx', borderRadius: '50%', background: '#FFFFFF' }} />
              <View style={{ position: 'absolute', left: '208rpx', bottom: '101rpx', zIndex: 3 }}>
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: '38rpx', fontWeight: 500, lineHeight: '53rpx', textShadow: '0 3rpx 4rpx rgba(0,0,0,0.5)' }}>筱脑虎</Text>
                  <View style={{ width: '168rpx', height: '48rpx', marginLeft: '10rpx', borderRadius: '24rpx', background: '#E3F1FE', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Image src={miniappOssIcons.profileCertification} mode="aspectFit" style={{ width: '30rpx', height: '30rpx', marginRight: '8rpx' }} />
                    <Text style={{ color: '#5D89DD', fontSize: '20rpx', fontWeight: 500, lineHeight: '28rpx' }}>三重认证</Text>
                  </View>
                </View>
                <View style={{ width: '148rpx', height: '48rpx', marginTop: '10rpx', borderRadius: '24rpx', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FE918E', fontSize: '27rpx', lineHeight: '28rpx', marginRight: '10rpx' }}>♥</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: '20rpx', fontWeight: 500, lineHeight: '28rpx' }}>佛系交友</Text>
                </View>
              </View>
            </View>

            <View style={{ position: 'relative', zIndex: 4, width: '700rpx', height: '198rpx', marginTop: '-105rpx', padding: '60rpx 30rpx 34rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
              <InfoLine icon={miniappOssIcons.profilePreviewGender} text="女丨97年丨163cm丨双鱼座" />
              <View style={{ height: '18rpx' }} />
              <InfoLine icon={miniappOssIcons.profilePreviewLocation} text="现居浙江杭州丨河南人" />
            </View>

            <View style={{ width: '700rpx', marginTop: '20rpx', padding: '32rpx 34rpx 38rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
              <View style={{ position: 'relative', height: '40rpx' }}>
                <View style={{ position: 'absolute', left: 0, top: '4rpx', width: '120rpx', height: '30rpx', borderRadius: '50%', background: 'rgba(211,240,255,0.7)' }} />
                <Text style={{ position: 'relative', zIndex: 1, color: '#333333', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>我的标签</Text>
              </View>
              <View style={{ marginTop: '20rpx' }}>
                {tagRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={{ height: '48rpx', marginTop: rowIndex ? '10rpx' : '0', display: 'flex', flexDirection: 'row', gap: '10rpx' }}>
                    {row.map((tag, tagIndex) => {
                      const style = tagStyles[(tagIndex + rowIndex) % tagStyles.length]
                      return (
                        <View key={`${rowIndex}-${tag}`} style={{ height: '48rpx', padding: '0 24rpx', borderRadius: '29rpx', background: style.background, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                          <Text style={{ color: style.color, fontSize: '24rpx', lineHeight: '33rpx', whiteSpace: 'nowrap' }}>{tag}</Text>
                        </View>
                      )
                    })}
                  </View>
                ))}
              </View>
            </View>

            <View style={{ width: '700rpx', height: '260rpx', marginTop: '20rpx', padding: '32rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
              <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>自我介绍</Text>
              <Text style={{ display: 'block', marginTop: '20rpx', color: '#7F8494', fontSize: '24rpx', lineHeight: '38rpx' }}>喜欢旅行和摄影，也享受安静的周末。希望遇见认真、真诚且有趣的你。</Text>
            </View>
            <View style={{ width: '700rpx', marginTop: '20rpx', padding: '32rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
              <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>个人动态</Text>
              <Text style={{ display: 'block', marginTop: '20rpx', color: '#596273', fontSize: '24rpx', lineHeight: '38rpx' }}>周末去西湖边拍了晚霞，也开始学习做一道新的家常菜。</Text>
              <Text style={{ display: 'block', marginTop: '12rpx', color: '#A0A6B2', fontSize: '20rpx' }}>2 小时前 · 公开动态</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={{ position: 'fixed', left: '55rpx', right: '55rpx', bottom: '30rpx', zIndex: 50, display: 'flex', flexDirection: 'row', gap: '20rpx' }}>
        <View onClick={toggleLike} style={{ width: '210rpx', height: '98rpx', borderRadius: '49rpx', background: liked ? '#FFF0F2' : '#FFFFFF', border: '2rpx solid #FF5E6E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FF5E6E', fontSize: '28rpx', fontWeight: 500 }}>{liked ? '取消喜欢' : '喜欢'}</Text>
        </View>
        <View onClick={() => Taro.showToast({ title: matched ? '正在打开聊天' : '匹配后才能聊天', icon: 'none' })} style={{ flex: 1, height: '98rpx', borderRadius: '49rpx', background: '#FF5E6E', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8rpx 22rpx rgba(255,94,110,0.25)' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500 }}>{matched ? '聊天' : '打招呼'}</Text>
        </View>
      </View>
    </View>
  )
}

function InfoLine({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ height: '36rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <Image src={icon} mode="aspectFit" style={{ width: '30rpx', height: '34rpx', marginRight: '14rpx' }} />
      <Text style={{ color: '#333333', fontSize: '24rpx', lineHeight: '34rpx' }}>{text}</Text>
    </View>
  )
}
