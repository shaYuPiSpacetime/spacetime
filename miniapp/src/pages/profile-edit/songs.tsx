import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { getDemoPageData } from '@/services/lanhuDemo'

type ProfileDemo = {
  editProfile: {
    favoriteSongs: {
      title: string
      selected: string[]
      options: string[]
      successText: string
    }
  }
}

const profileDemo = getDemoPageData('profile') as ProfileDemo
const mainBlue = '#2876FF'
const titleColor = '#0C285A'
const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)'

export default function ProfileEditSongsPage() {
  const router = useRouter()
  const variant = String(router.params.variant || 'default')
  const songs = profileDemo.editProfile.favoriteSongs
  const [selected, setSelected] = useState(songs.selected)

  const handleBack = () => {
    Taro.navigateBack({ fail: () => Taro.redirectTo({ url: '/pages/profile/edit' }) })
  }

  const toggleSong = (song: string) => {
    setSelected((current) => {
      if (current.includes(song)) return current.filter((item) => item !== song)
      return [...current, song]
    })
  }

  const handleSave = () => {
    Taro.redirectTo({ url: '/pages/profile-edit/songs?variant=added' })
  }

  return (
    <View style={{ minHeight: '100vh', background: pageBackground }}>
      <ProfileEditSubNav title={songs.title || '爱听的歌曲'} onBack={handleBack} />
      <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)', width: '750rpx' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '24rpx 25rpx 172rpx', boxSizing: 'border-box' }}>
          {variant === 'added' ? (
            <View
              style={{
                width: '700rpx',
                height: '86rpx',
                borderRadius: '8rpx',
                background: '#E9F4FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '28rpx',
              }}
            >
              <Text style={{ color: mainBlue, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 700 }}>{songs.successText}</Text>
            </View>
          ) : null}

          <Text style={{ display: 'block', color: titleColor, fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 700 }}>
            选择你喜欢的歌曲
          </Text>
          <Text style={{ display: 'block', color: '#8A93A5', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '10rpx' }}>
            分享你的音乐灵魂，遇见相同频率的人
          </Text>
          <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '34rpx' }}>
            {songs.options.map((song) => {
              const active = selected.includes(song)
              return (
                <View
                  key={song}
                  onClick={() => toggleSong(song)}
                  style={{
                    height: '98rpx',
                    borderRadius: '49rpx',
                    background: active ? mainBlue : '#FFFFFF',
                    padding: '0 34rpx',
                    marginRight: '18rpx',
                    marginBottom: '22rpx',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: active ? '#FFFFFF' : '#333333', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: active ? 700 : 400 }}>
                    {song}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      </ScrollView>
      <View onClick={handleSave} style={{ position: 'fixed', left: '25rpx', bottom: '48rpx', width: '700rpx', height: '98rpx', borderRadius: '49rpx', background: mainBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 700 }}>保存</Text>
      </View>
    </View>
  )
}

function ProfileEditSubNav({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ position: 'relative', width: '750rpx', height: '164rpx' }}>
      <View onClick={onBack} style={{ position: 'absolute', left: '18rpx', top: '82rpx', width: '86rpx', height: '72rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: titleColor, fontSize: '54rpx', lineHeight: '60rpx', fontWeight: 300 }}>‹</Text>
      </View>
      <Text style={{ position: 'absolute', left: '0', top: '98rpx', width: '750rpx', color: titleColor, fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 500, textAlign: 'center' }}>{title}</Text>
    </View>
  )
}
