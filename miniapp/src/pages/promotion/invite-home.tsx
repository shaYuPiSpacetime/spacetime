import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { TOKEN_KEY } from '@/constants/config'
import { resolveInviteShareTarget } from '@/domain/promotionAttribution'
import inviteEmpty from '@/assets/lanhu/promotion/invite-empty.png'
import inviteHero from '@/assets/lanhu/promotion/invite-hero.png'
import { getInviteHome } from '@/services/promotion'
import { capturePromotionSource } from '@/services/promotionAttribution'
import { useAuthStore } from '@/stores/authStore'
import type { InviteHomeVO, InviteLadderVO, RecentInviteVO } from '@/types/promotion'
import './invite-home.scss'

const EMPTY_SHARE = {
  title: '邀请好友，一起遇见更好的缘分',
  path: '/pages/promotion/invite-home',
  link: '',
}

function formatRecordTime(value: string) {
  if (!value) return ''
  return value.replace(/^\d{4}-/, '').replace('T', ' ').slice(0, 11)
}

function displayedLadderStage(ladders: InviteLadderVO[], current: number) {
  if (!ladders.length) {
    return {
      ladders: [] as InviteLadderVO[],
      max: 0,
      progress: 0,
    }
  }

  const ordered = [...ladders].sort((left, right) => left.threshold - right.threshold)
  const firstPending = ordered.findIndex(item => !item.achieved && current < item.threshold)
  const pivot = firstPending < 0 ? ordered.length - 1 : firstPending
  const start = Math.max(0, Math.floor(pivot / 3) * 3)
  const visible = ordered.slice(start, start + 3)
  const stageBase = start > 0 ? ordered[start - 1].threshold : 0
  const stageMax = visible[visible.length - 1]?.threshold || ordered[ordered.length - 1].threshold
  const span = Math.max(stageMax - stageBase, 1)
  const progress = Math.min(Math.max((current - stageBase) / span, 0), 1) * 100

  return { ladders: visible, max: stageMax, progress }
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

  const recentRecords = data?.recentRecords.slice(0, 3) || []
  const hasRecentRecords = recentRecords.length > 0
  const ladderStage = useMemo(
    () => displayedLadderStage(data?.ladders || [], Number(data?.progressCurrent || 0)),
    [data?.ladders, data?.progressCurrent],
  )
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
        <View className="promotion-home__canvas">
          <View className="promotion-hero">
            <View className="promotion-hero__coin-watermark">¥</View>
            <Text className="promotion-hero__eyebrow">好友同行·奖励加倍</Text>
            <Text className="promotion-hero__title">一起遇见{'\n'}更好的缘分</Text>
            <Text className="promotion-hero__subtitle">好友完成注册即邀请成功，关系永久有效</Text>
            <Image className="promotion-hero__art" src={inviteHero} mode="scaleToFill" />
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
                  max={ladderStage.max || data.progressMax || 0}
                  progress={ladderStage.progress}
                  ladders={ladderStage.ladders}
                />
                <RecentCard
                  records={recentRecords}
                  empty={!hasRecentRecords}
                  onAll={() => void Taro.navigateTo({ url: '/pages/promotion/invite-records' })}
                />
                <RulesCard
                  onOpen={() => void Taro.navigateTo({ url: '/pages/promotion/invite-rules' })}
                />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function CardTitle({
  children,
  onClick,
}: {
  children: string
  onClick?: () => void
}) {
  if (onClick) {
    return (
      <Button className="promotion-card__title promotion-card__title--button" onClick={onClick}>
        {children}
      </Button>
    )
  }
  return (
    <View className="promotion-card__title">
      <Text>{children}</Text>
    </View>
  )
}

function CardShell({
  className,
  children,
}: {
  className: string
  children: ReactNode
}) {
  return (
    <View className={`promotion-card ${className}`}>
      <View className="promotion-card__surface">{children}</View>
    </View>
  )
}

function EquationGlyph({ type }: { type: 'share' | 'person' | 'coin' }) {
  const typeClass = type === 'share'
    ? 'promotion-equation__glyph--share'
    : type === 'person'
      ? 'promotion-equation__glyph--person'
      : 'promotion-equation__glyph--coin'

  return (
    <View className={`promotion-equation__glyph ${typeClass}`}>
      {type === 'share' ? <View className="promotion-equation__share-arrow">➜</View> : null}
      {type === 'person' ? (
        <>
          <View className="promotion-equation__person-head" />
          <View className="promotion-equation__person-body" />
        </>
      ) : null}
      {type === 'coin' ? <Text>¥</Text> : null}
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
    <CardShell className="promotion-reward-card">
      <CardTitle>邀请注册得千寻币</CardTitle>
      <View className="promotion-equation">
        <View className="promotion-equation__item">
          <EquationGlyph type="share" />
          <Text>邀请好友</Text>
        </View>
        <Text className="promotion-equation__operator">＋</Text>
        <View className="promotion-equation__item">
          <EquationGlyph type="person" />
          <Text>好友注册</Text>
        </View>
        <Text className="promotion-equation__operator">＝</Text>
        <View className="promotion-equation__item">
          <EquationGlyph type="coin" />
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
    </CardShell>
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
  max: number
  progress: number
  ladders: InviteLadderVO[]
}) {
  return (
    <CardShell className="promotion-progress-card">
      <CardTitle>邀请进度</CardTitle>
      <View className="promotion-metrics">
        <View className="promotion-metrics__item">
          <Text>累计邀请成功</Text>
          <Text className="promotion-metrics__number">{successCount}</Text>
          <Text>人</Text>
        </View>
        <View className="promotion-metrics__divider" />
        <View className="promotion-metrics__item">
          <Text>累计到账</Text>
          <Text className="promotion-metrics__number promotion-metrics__number--orange">
            {paidRewardTotal}
          </Text>
          <Text>币</Text>
        </View>
      </View>
      {ladders.length ? (
        <View className="promotion-ladder">
          <Text className="promotion-ladder__heading">
            累计邀请额外奖励
            <Text>（已完成{current}/{max}）</Text>
          </Text>
          <View className="promotion-ladder__track">
            <View className="promotion-ladder__rail">
              <View className="promotion-ladder__rail-progress" style={{ width: `${progress}%` }} />
            </View>
            <View
              className="promotion-ladder__steps"
              style={{ gridTemplateColumns: `repeat(${ladders.length}, minmax(0, 1fr))` }}
            >
              {ladders.map(ladder => (
                <View
                  key={ladder.threshold}
                  className={`promotion-ladder__step${ladder.achieved ? ' is-achieved' : ''}`}
                >
                  <View className="promotion-ladder__reward">
                    <Text className="promotion-ladder__coin">¥</Text>
                    <Text>+{ladder.rewardAmount}</Text>
                  </View>
                  <Text className="promotion-ladder__label">
                    {ladder.achieved ? '已获得' : `完成${ladder.threshold}人`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View className="promotion-ladder-empty">当前暂无额外阶梯奖励</View>
      )}
    </CardShell>
  )
}

function RecentCard({
  records,
  empty,
  onAll,
}: {
  records: RecentInviteVO[]
  empty: boolean
  onAll: () => void
}) {
  return (
    <CardShell className={`promotion-records-card${empty ? ' promotion-records-card--empty' : ''}`}>
      <CardTitle>邀请记录</CardTitle>
      {empty ? (
        <View className="promotion-records-empty">
          <Image className="promotion-records-empty__art" src={inviteEmpty} mode="scaleToFill" />
          <Text>暂无邀请记录，快去邀请好友得千寻币吧</Text>
        </View>
      ) : (
        <>
          <View className="promotion-recent-list">
            {records.map(record => (
              <View className="promotion-recent-row" key={record.relationNo}>
                {record.invitee.avatarUrl ? (
                  <Image
                    className="promotion-recent-row__avatar"
                    src={record.invitee.avatarUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <View className="promotion-recent-row__avatar promotion-recent-row__avatar--fallback">
                    <View className="promotion-recent-row__head" />
                    <View className="promotion-recent-row__body" />
                  </View>
                )}
                <View className="promotion-recent-row__copy">
                  <Text>{record.invitee.nickname || record.invitee.mobileMasked || '邀请好友'}</Text>
                  <Text>{formatRecordTime(record.registeredAt)}&nbsp;&nbsp;注册成功</Text>
                </View>
                <Text className="promotion-recent-row__amount">+{record.rewardAmount}</Text>
              </View>
            ))}
          </View>
          <Button className="promotion-all-button" onClick={onAll}>查看全部</Button>
        </>
      )}
    </CardShell>
  )
}

function RulesCard({ onOpen }: { onOpen: () => void }) {
  return (
    <CardShell className="promotion-rules-card">
      <CardTitle onClick={onOpen}>邀请规则</CardTitle>
      <Text className="promotion-rules-card__copy">
        1、好友通过你的专属入口完成注册即成功；{'\n'}
        2、邀请关系建立后永久有效，不重复绑定；{'\n'}
        3、命中累计人数档位的当次，可额外获得一笔阶梯奖励。
      </Text>
    </CardShell>
  )
}

function HomeSkeleton() {
  return (
    <View className="promotion-home__content promotion-home__content--state">
      {[249, 214, 289].map(height => (
        <View className="promotion-state-card promotion-state-card--skeleton" style={{ height: `${height}px` }} key={height}>
          <View /><View /><View />
        </View>
      ))}
    </View>
  )
}

function HomeError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => Promise<void>
}) {
  return (
    <View className="promotion-home__content promotion-home__content--state">
      <View className="promotion-state-card promotion-home-error">
        <Text className="promotion-home-error__title">邀请数据加载失败</Text>
        <Text className="promotion-home-error__message">{message}</Text>
        <Button className="promotion-home-error__button" onClick={() => void onRetry()}>
          重新加载
        </Button>
      </View>
    </View>
  )
}
