import { Image, Text, View } from '@tarojs/components'
import { miniappOssIcons } from '@/constants/ossIcons'

const BLUE = '#2876FF'

/** 获赞说明在当前页面展示，关闭时阻止点击继续传到底层入口。 */
export default function CommunityLikeSummary({ visible, count, nickname, onClose }: { visible: boolean; count: number; nickname: string; onClose: () => void }) {
  return (
    <View data-role="community-like-summary" onClick={visible ? event => { event.stopPropagation(); onClose() } : undefined} style={{ visibility: visible ? 'visible' : 'hidden', pointerEvents: visible ? 'auto' : 'none', position: 'fixed', inset: 0, background: 'rgba(20,28,38,.34)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {visible ? <View onClick={event => event.stopPropagation()} style={{ width: '620rpx', borderRadius: '32rpx', background: '#FFFFFF', padding: '46rpx 50rpx 28rpx', boxSizing: 'border-box' }}>
        <View style={{ height: '126rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[0, 1, 2, 3, 4].map(index => <Image key={index} src={miniappOssIcons.qianxunLikeActive} mode="aspectFit" style={{ width: index === 2 ? '42rpx' : '32rpx', height: index === 2 ? '42rpx' : '32rpx', margin: index === 2 ? '0 10rpx' : '0 5rpx', marginTop: index % 2 ? '-20rpx' : '14rpx' }} />)}
        </View>
        <Text style={{ display: 'block', color: '#222222', fontSize: '30rpx', lineHeight: '44rpx', fontWeight: 600, textAlign: 'center' }}>“{nickname}”共获得{count}个赞</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '25rpx', lineHeight: '39rpx', textAlign: 'center', marginTop: '14rpx' }}>获赞数含动态、日常、诚意帖点赞，重复点赞仅累计一次</Text>
        <View onClick={event => { event.stopPropagation(); onClose() }} style={{ height: '70rpx', borderRadius: '7rpx', background: BLUE, marginTop: '38rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '27rpx' }}>我知道了</Text></View>
      </View> : null}
    </View>
  )
}

