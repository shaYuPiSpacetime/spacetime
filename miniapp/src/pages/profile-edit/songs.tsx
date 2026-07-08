import { Input, ScrollView, Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { getDemoPageData } from '@/services/lanhuDemo'
import { navigateBackOrRedirect } from '@/utils/navigation'

type SongRecord = {
  title: string
  artist: string
}

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
const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 48%, rgba(248,250,239,0.72) 100%)'

export default function ProfileEditSongsPage() {
  const router = useRouter()
  const variant = String(router.params.variant || 'default')
  const songs = profileDemo.editProfile.favoriteSongs
  const [selected, setSelected] = useState(songs.selected)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [saved, setSaved] = useState(variant === 'added')
  const songRecords = useMemo(() => buildSongRecords(songs.options), [songs.options])
  const visibleSongs = songRecords.filter((song) => `${song.title}${song.artist}`.includes(searchKeyword.trim()))

  const handleBack = () => {
    navigateBackOrRedirect()
  }

  const toggleSong = (song: SongRecord) => {
    setSelected((current) => {
      if (current.includes(song.title)) return current.filter((item) => item !== song.title)
      return [...current, song.title]
    })
    setSaved(true)
  }

  return (
    <View style={{ minHeight: '100vh', background: pageBackground }}>
      <LanhuSubNav title={`添加${songs.title || '爱听的歌曲'}`} onBack={handleBack} />
      <View
        style={{
          width: '700rpx',
          height: '88rpx',
          borderRadius: '8rpx',
          background: '#FFFFFF',
          margin: '38rpx auto 20rpx',
          display: 'flex',
          alignItems: 'center',
          padding: '0 30rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ color: '#8A93A5', fontSize: '44rpx', lineHeight: '44rpx', marginRight: '16rpx' }}>⌕</Text>
        <Input
          value={searchKeyword}
          placeholder="搜索歌曲名称"
          placeholderStyle="color:#8A93A5;font-size:30rpx;line-height:88rpx"
          onInput={(event) => setSearchKeyword(event.detail.value)}
          style={{ flex: 1, height: '88rpx', color: '#333333', fontSize: '30rpx', lineHeight: '88rpx' }}
        />
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 310rpx)', width: '750rpx' }} showScrollbar={false}>
        <View
          style={{
            position: 'relative',
            width: '700rpx',
            minHeight: '1150rpx',
            borderRadius: '8rpx',
            background: '#FFFFFF',
            margin: '0 auto',
            padding: '30rpx 0 34rpx',
            boxSizing: 'border-box',
          }}
        >
          {visibleSongs.map((song, index) => (
            <SongRecordRow
              key={`${song.title}-${index}`}
              song={song}
              active={selected.includes(song.title)}
              onClick={() => toggleSong(song)}
            />
          ))}
          {saved ? <SongSuccessToast text={songs.successText || '歌曲添加成功'} /> : null}
        </View>
      </ScrollView>
    </View>
  )
}

function SongRecordRow({ song, active, onClick }: { song: SongRecord; active: boolean; onClick: () => void }) {
  return (
    <View
      onClick={onClick}
      style={{
        height: '120rpx',
        padding: '0 30rpx',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <MusicDisc active={active} />
      <View style={{ flex: 1, minWidth: 0, marginLeft: '28rpx' }}>
        <Text numberOfLines={1} style={{ display: 'block', color: '#333333', fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 800 }}>
          {song.title}
        </Text>
        <Text numberOfLines={1} style={{ display: 'block', color: '#999999', fontSize: '28rpx', lineHeight: '40rpx', marginTop: '8rpx' }}>
          {song.artist}
        </Text>
      </View>
      {active ? (
        <View style={{ width: '42rpx', height: '42rpx', borderRadius: '42rpx', background: mainBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '28rpx', lineHeight: '34rpx', fontWeight: 800 }}>✓</Text>
        </View>
      ) : null}
    </View>
  )
}

function MusicDisc({ active }: { active: boolean }) {
  return (
    <View
      style={{
        position: 'relative',
        width: '98rpx',
        height: '98rpx',
        borderRadius: '98rpx',
        background: active ? '#2876FF' : 'linear-gradient(180deg, #7FA1FF 0%, #2876FF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: '42rpx', height: '42rpx', borderRadius: '42rpx', border: '3rpx solid rgba(255,255,255,0.72)', boxSizing: 'border-box' }} />
      <Text style={{ position: 'absolute', right: '20rpx', bottom: '18rpx', color: '#FFFFFF', fontSize: '32rpx', lineHeight: '32rpx', fontWeight: 700 }}>♪</Text>
    </View>
  )
}

function SongSuccessToast({ text }: { text: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '205rpx',
        top: '150rpx',
        width: '290rpx',
        height: '98rpx',
        borderRadius: '8rpx',
        background: 'rgba(0,0,0,0.34)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: '32rpx', lineHeight: '45rpx' }}>{text}</Text>
    </View>
  )
}

function buildSongRecords(options: string[]): SongRecord[] {
  const fallback: SongRecord[] = [
    { title: '告白气球', artist: '周杰伦' },
    { title: '夜空中最亮的星', artist: '逃跑计划' },
    { title: '总有一天你会出现在我身边', artist: '棱镜乐队' },
  ]
  const records = options.map((title, index) => ({
    title: index < fallback.length ? fallback[index].title : title,
    artist: index < fallback.length ? fallback[index].artist : ['周杰伦', '莫文蔚', '孙燕姿'][index % 3],
  }))
  return [...records, ...fallback, ...records, ...fallback]
}
