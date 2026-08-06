import { Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { resolveOwnerVisibleText } from '@/domain/profileAboutPresentation'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { OpenTextDetail } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'
import { emitProfileUpdated } from '@/utils/profileEditEvents'

const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 50%, rgba(248,250,239,0.72) 100%)'

export default function ProfileEditIntroPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [detail, setDetail] = useState<OpenTextDetail>()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        const result = await prd01Api.getIntroduction()
        setDetail(result)
        setValue(resolveOwnerVisibleText(result))
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  const save = async () => {
    if (saving || detail?.canSubmit === false) return
    setSaving(true)
    try {
      await prd01Api.submitIntroduction(value.trim())
      const result = await prd01Api.getIntroduction()
      const nextValue = resolveOwnerVisibleText(result) || value.trim()
      setDetail(result)
      setValue(nextValue)
      emitProfileUpdated({ type: 'intro', value: nextValue })
      await Taro.showToast({ title: '保存成功', icon: 'success' })
      await navigateBackOrRedirect()
    } catch (error) {
      await showError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ minHeight: '100vh', background: pageBackground }}>
      <LanhuSubNav title="自我介绍" onBack={navigateBackOrRedirect} />
      <View style={{ width: '700rpx', margin: '60rpx auto 0' }}>
        <Text
          style={{
            display: 'block',
            color: '#0C285A',
            fontSize: '50rpx',
            lineHeight: '70rpx',
            fontWeight: 800,
          }}
        >
          自我介绍
        </Text>
        <Text
          style={{
            display: 'block',
            color: '#999999',
            fontSize: '27rpx',
            lineHeight: '42rpx',
            marginTop: '18rpx',
          }}
        >
          介绍下自己的性格、习惯、有点、缺点
        </Text>
        <View
          style={{
            minHeight: '500rpx',
            borderRadius: '16rpx',
            background: '#FFFFFF',
            marginTop: '68rpx',
            padding: '34rpx 38rpx 28rpx',
            boxSizing: 'border-box',
          }}
        >
          <Textarea
            value={value}
            maxlength={300}
            placeholder="写下你的自我介绍"
            onInput={event => setValue(event.detail.value)}
            style={{
              width: '624rpx',
              minHeight: '390rpx',
              color: '#333333',
              fontSize: '29rpx',
              lineHeight: '48rpx',
            }}
          />
          <Text
            style={{
              display: 'block',
              color: '#999999',
              fontSize: '24rpx',
              lineHeight: '34rpx',
              textAlign: 'right',
            }}
          >
            最少20字
          </Text>
        </View>
        {detail?.auditStatus ? (
          <Text style={{ display: 'block', color: '#2876FF', fontSize: '24rpx', marginTop: '16rpx' }}>
            {optionLabel('auditStatus', detail.auditStatus)}
          </Text>
        ) : null}
        {detail?.rejectReason ? (
          <Text style={{ display: 'block', color: '#E36A6A', fontSize: '24rpx', marginTop: '12rpx' }}>
            {detail.rejectReason}
          </Text>
        ) : null}
        <View
          data-role="profile-intro-save"
          style={{
            height: '96rpx',
            borderRadius: '16rpx',
            background: detail?.canSubmit === false ? '#CEE0F8' : '#2876FF',
            marginTop: '120rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => void save()}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '34rpx', lineHeight: '48rpx' }}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </View>
      </View>
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
