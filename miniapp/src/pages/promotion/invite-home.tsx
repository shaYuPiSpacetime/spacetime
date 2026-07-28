import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { resolveInviteShareTarget } from '@/domain/promotionAttribution'
import { getInviteHome } from '@/services/promotion'
import { capturePromotionSource } from '@/services/promotionAttribution'
import { useAuthStore } from '@/stores/authStore'
import { TOKEN_KEY } from '@/constants/config'
import type { InviteHomeVO, InviteRewardStatus, RecentInviteVO } from '@/types/promotion'
import inviteCouple from './assets/invite-couple.png'
import './invite-home.scss'

const EMPTY_SHARE = {
  title: '邀请好友，一起遇见更好的缘分',
  path: '/pages/promotion/invite-home',
  link: '',
}

function rewardStatusLabel(status: InviteRewardStatus) {
  if (status === 'success') return '已发放'
  if (status === 'failed') return '发放失败'
  return '待发放'
}

function formatRecordTime(value: string) {
  if (!value) return ''
  return value.replace(/^\d{4}-/, '').slice(0, 11)
}

export default function InviteHomePage() {
  const router = useRouter()
  const [data, setData] = useState<InviteHomeVO>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareAvailable, setShareAvailable] = useState(Taro.getEnv() === Taro.ENV_TYPE.WEAPP)

  const shareContext = data?.shareContext || EMPTY_SHARE
  const shareTarget = useMemo(
    () => resolveInviteShareTarget(shareContext),
    [shareContext],
  )
  const nativeShareReady = shareAvailable && shareTarget.attributable
  useShareAppMessage(() => ({
    title: shareTarget.title || EMPTY_SHARE.title,
    path: shareTarget.path,
  }))

  const loadHome = useCallback(async () => {
    const auth = useAuthStore.getState()
    auth.checkLogin()
    if (!useAuthStore.getState().isLoggedIn) {
      await Taro.redirectTo({ url: '/pages/login/index' })
      return
    }

    setLoading(true)
    setError('')
    try {
      setData(await getInviteHome())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '邀请数据加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const persistForRegistration = !Taro.getStorageSync(TOKEN_KEY)
    void capturePromotionSource(
      router.params as Record<string, unknown>,
      persistForRegistration,
    ).catch(() => {
      // 页面仍可继续展示，归因失败由服务端登录链路按无来源处理。
    })
  }, [router.params])

  useEffect(() => {
    void loadHome()
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      setShareAvailable(false)
      return
    }
    void Taro.showShareMenu({ withShareTicket: true }).catch(() => setShareAvailable(false))
  }, [loadHome])

  const copyShareLink = useCallback(async () => {
    if (!shareTarget.attributable || !shareTarget.link) {
      await Taro.showToast({ title: '邀请链接生成中，请稍后重试', icon: 'none' })
      return
    }
    try {
      await Taro.setClipboardData({ data: shareTarget.link })
      await Taro.showToast({ title: '邀请链接已复制，请发送给好友', icon: 'none' })
    } catch {
      await Taro.showToast({ title: '复制失败，请稍后重试', icon: 'none' })
    }
  }, [shareTarget.attributable, shareTarget.link])

  const handleInvite = useCallback(() => {
    if (nativeShareReady && Taro.getEnv() === Taro.ENV_TYPE.WEAPP) return
    void copyShareLink()
  }, [copyShareLink, nativeShareReady])

  const progress = useMemo(() => {
    const max = Number(data?.progressMax || 0)
    if (!max) return 0
    return Math.min(Number(data?.progressCurrent || 0) / max, 1) * 100
  }, [data?.progressCurrent, data?.progressMax])

  const recentRecords = data?.recentRecords.slice(0, 3) || []
  const showContent = Boolean(data) && !loading && !error

  return (
    <View className="promotion-home">
      <NativeNavigation
        title="邀请好友"
        titleColor="#ffffff"
        background="transparent"
        showBack
        fallbackUrl="/pages/profile/index"
        overlay
      />

      <ScrollView className="promotion-home__scroll" scrollY enhanced showScrollbar={false}>
        <View className="promotion-hero">
          <View className="promotion-hero__halo promotion-hero__halo--large" />
          <View className="promotion-hero__halo promotion-hero__halo--small" />
          <View className="promotion-hero__copy">
            <Text className="promotion-hero__eyebrow">好友同行·奖励加倍</Text>
            <Text className="promotion-hero__title">一起遇见{'\n'}更好的缘分</Text>
            <Text className="promotion-hero__subtitle">好友完成注册即邀请成功，关系永久有效</Text>
          </View>
          <Image className="promotion-hero__art" src={inviteCouple} mode="aspectFit" />
        </View>

        <View className="promotion-home__data">
          {loading ? <HomeSkeleton /> : null}
          {!loading && error ? <HomeError message={error} onRetry={loadHome} /> : null}
          {showContent && data ? (
            <View className="promotion-home__content">
              <RewardCard
                amount={data.registerReward}
                shareAvailable={nativeShareReady}
                onInvite={handleInvite}
                onRules={() => void Taro.navigateTo({ url: '/pages/promotion/invite-rules' })}
              />
              <ProgressCard
                successCount={data.successCount}
                paidRewardTotal={data.paidRewardTotal}
                current={data.progressCurrent}
                max={data.progressMax}
                progress={progress}
                ladders={data.ladders}
              />
              <RecentCard
                records={recentRecords}
                onInvite={handleInvite}
                onAll={() => void Taro.navigateTo({ url: '/pages/promotion/invite-records' })}
              />
              <RulesCard onOpen={() => void Taro.navigateTo({ url: '/pages/promotion/invite-rules' })} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  )
}

function CardTitle({ children }: { children: string }) {
  return (
    <View className="promotion-card__title">
      <Text>{children}</Text>
    </View>
  )
}

function RewardCard({
  amount,
  shareAvailable,
  onInvite,
  onRules,
}: {
  amount: number
  shareAvailable: boolean
  onInvite: () => void
  onRules: () => void
}) {
  return (
    <View className="promotion-card promotion-reward-card">
      <CardTitle>邀请注册得千寻币</CardTitle>
      <View className="promotion-equation">
        <View className="promotion-equation__item">
          <View className="promotion-equation__icon promotion-equation__icon--share">↗</View>
          <Text>邀请好友</Text>
        </View>
        <Text className="promotion-equation__operator">＋</Text>
        <View className="promotion-equation__item">
          <View className="promotion-equation__icon promotion-equation__icon--person">
            <View />
          </View>
          <Text>好友注册</Text>
        </View>
        <Text className="promotion-equation__operator">＝</Text>
        <View className="promotion-equation__item">
          <View className="promotion-equation__icon promotion-equation__icon--coin">¥</View>
          <Text>获得{amount}千寻币</Text>
        </View>
      </View>
      <Button
        className="promotion-primary-button"
        openType={shareAvailable ? 'share' : undefined}
        onClick={onInvite}
      >
        立即邀请
      </Button>
      <View className="promotion-reward-note">
        <Text>必须是新用户，老用户不计入邀请，无法获得奖励</Text>
        <Button className="promotion-text-button" onClick={onRules}>活动说明</Button>
      </View>
    </View>
  )
}

function ProgressCard({
  successCount,
  paidRewardTotal,
  current,
  max,
  progress,
  ladders,
}: {
  successCount: number
  paidRewardTotal: number
  current: number
  max?: number | null
  progress: number
  ladders: InviteHomeVO['ladders']
}) {
  return (
    <View className="promotion-card promotion-progress-card">
      <CardTitle>邀请进度</CardTitle>
      <View className="promotion-metrics">
        <View>
          <Text>累计邀请成功</Text>
          <Text className="promotion-metrics__number">{successCount}<Text>人</Text></Text>
        </View>
        <View className="promotion-metrics__divider" />
        <View>
          <Text>累计到账</Text>
          <Text className="promotion-metrics__number promotion-metrics__number--orange">
            {paidRewardTotal}<Text>币</Text>
          </Text>
        </View>
      </View>
      {ladders.length ? (
        <View className="promotion-ladder">
          <Text className="promotion-ladder__heading">
            累计邀请额外奖励
            <Text>（已完成{current}/{max || ladders[ladders.length - 1]?.threshold || 0}）</Text>
          </Text>
          <ScrollView className="promotion-ladder__scroller" scrollX enhanced showScrollbar={false}>
            <View
              className="promotion-ladder__track"
              style={{ width: `${Math.max(ladders.length * 140, 600)}rpx` }}
            >
              <View className="promotion-ladder__rail">
                <View className="promotion-ladder__rail-progress" style={{ width: `${progress}%` }} />
              </View>
              <View
                className="promotion-ladder__steps"
                style={{ gridTemplateColumns: `repeat(${Math.max(ladders.length, 1)}, minmax(0, 1fr))` }}
              >
                {ladders.map(ladder => (
                  <View
                    key={ladder.threshold}
                    className={`promotion-ladder__step${ladder.achieved ? ' is-achieved' : ''}`}
                  >
                    <Text className="promotion-ladder__reward">◎+{ladder.rewardAmount}</Text>
                    <View className="promotion-ladder__dot" />
                    <Text>{ladder.achieved ? '已获得' : `完成${ladder.threshold}人`}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        <View className="promotion-ladder-empty">当前暂无启用阶梯</View>
      )}
    </View>
  )
}

function RecentCard({
  records,
  onInvite,
  onAll,
}: {
  records: RecentInviteVO[]
  onInvite: () => void
  onAll: () => void
}) {
  return (
    <View className="promotion-card promotion-recent-card">
      <CardTitle>邀请记录</CardTitle>
      {records.length ? (
        <View className="promotion-recent-list">
          {records.map(record => (
            <View className="promotion-recent-row" key={record.relationNo}>
              {record.invitee.avatarUrl ? (
                <Image className="promotion-avatar" src={record.invitee.avatarUrl} mode="aspectFill" />
              ) : (
                <View className="promotion-avatar promotion-avatar--fallback">
                  {(record.invitee.nickname || '友').slice(0, 1)}
                </View>
              )}
              <View className="promotion-recent-row__info">
                <Text>{record.invitee.nickname || record.invitee.mobileMasked || '邀请好友'}</Text>
                <Text>{formatRecordTime(record.registeredAt)} · {rewardStatusLabel(record.rewardStatus)}</Text>
              </View>
              <Text className="promotion-recent-row__reward">+{record.rewardAmount}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="promotion-empty">
          <View className="promotion-empty__icon">◎</View>
          <Text className="promotion-empty__title">还没有邀请记录</Text>
          <Text className="promotion-empty__description">邀请好友注册，开启第一份同行奖励</Text>
          <Button className="promotion-text-button" onClick={onInvite}>立即邀请</Button>
        </View>
      )}
      <Button className="promotion-all-button" onClick={onAll}>查看全部</Button>
    </View>
  )
}

function RulesCard({ onOpen }: { onOpen: () => void }) {
  return (
    <View className="promotion-card promotion-rules-card">
      <CardTitle>邀请规则</CardTitle>
      <View className="promotion-rules-list">
        <Text>1、好友通过你的专属入口完成注册即成功；</Text>
        <Text>2、邀请关系建立后永久有效，不重复绑定；</Text>
        <Text>3、命中累计人数档位的当次，可额外获得一笔阶梯奖励。</Text>
      </View>
      <Button className="promotion-rules-link" onClick={onOpen}>查看完整规则</Button>
    </View>
  )
}

function HomeSkeleton() {
  return (
    <View className="promotion-state-card promotion-skeleton">
      <View /><View /><View />
      <Text>数据加载中</Text>
    </View>
  )
}

function HomeError({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return (
    <View className="promotion-state-card promotion-error">
      <View className="promotion-error__icon">!</View>
      <Text className="promotion-error__title">网络开小差了</Text>
      <Text className="promotion-error__message">{message}</Text>
      <Button className="promotion-primary-button" onClick={() => void onRetry()}>重新加载</Button>
    </View>
  )
}
