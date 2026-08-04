import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { ensureBasicProfileNickname } from '@/domain/basicProfilePresentation'
import {
  buildBasicProfileSavePayload,
  normalizeTwoLevelRegionFieldSettings,
  toTwoLevelRegionErrorMessage,
} from '@/domain/basicProfileRegion'
import { prd01Api } from '@/services/prd01'
import { useAuthStore } from '@/stores/authStore'
import { usePrd01Store } from '@/stores/prd01Store'
import type { BasicProfile, ProfileFieldSetting, RegionTreeOption } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'
import { emitProfileUpdated } from '@/utils/profileEditEvents'
import VerificationShell from './components/VerificationShell'
import VerificationRuntimeBoundary from './components/VerificationRuntimeBoundary'
import BasicInfoCard from './components/BasicInfoCard'

export default function VerificationBasicPage() {
  const router = useRouter()
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const copy = usePrd01Store(state => state.copy)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const loadProvinceCities = usePrd01Store(state => state.provinceCities)
  const [basic, setBasic] = useState<BasicProfile>({})
  const [fieldSettings, setFieldSettings] = useState<ProfileFieldSetting[]>([])
  const [regionTree, setRegionTree] = useState<RegionTreeOption[]>([])
  const [saving, setSaving] = useState(false)
  const [editorVisible, setEditorVisible] = useState(false)
  const fromProfile = router.params.from === 'profile'

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        const [result, regions] = await Promise.all([
          prd01Api.getBasicProfile(),
          loadProvinceCities(),
        ])
        setBasic(
          ensureBasicProfileNickname({
            ...result,
            userId: result.userId ?? useAuthStore.getState().userId ?? undefined,
          })
        )
        setFieldSettings(
          normalizeTwoLevelRegionFieldSettings(
            result.fieldSettings || usePrd01Store.getState().config?.fieldSettings || []
          ).filter(item => item.visible)
        )
        setRegionTree(regions)
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  const handleBack = () => {
    if (fromProfile) {
      void navigateBackOrRedirect()
      return
    }
    void navigateBackOrRedirect('/pages/index/index')
  }

  const updateField = (fieldId: string, value: unknown) => {
    const patch: BasicProfile = { [fieldId]: value }
    if (fieldId === 'locationProvince') {
      patch.locationCity = ''
      patch.locationDistrict = ''
    }
    if (fieldId === 'locationCity') patch.locationDistrict = ''
    if (fieldId === 'hometownProvince') {
      patch.hometownCity = ''
      patch.hometownDistrict = ''
    }
    if (fieldId === 'hometownCity') patch.hometownDistrict = ''

    setBasic(current => ({ ...current, ...patch }))
  }

  const updateFields = (patch: BasicProfile) => {
    setBasic(current => ({ ...current, ...patch }))
  }

  const save = async (continueVerification: boolean) => {
    if (saving) return
    setSaving(true)
    try {
      const payload = buildBasicProfileSavePayload(fieldSettings, basic)
      const result = await prd01Api.saveBasicProfile(payload)
      setBasic(result)
      if (fromProfile) emitProfileUpdated({ type: 'basic', basic: result })
      if (fromProfile) await Taro.showToast({ title: copy('common_save_success'), icon: 'success' })
      if (continueVerification) {
        await Taro.redirectTo({ url: '/pages/verification/avatar' })
      } else {
        await navigateBackOrRedirect()
      }
    } catch (error) {
      await showError(error)
    } finally {
      setSaving(false)
    }
  }

  const card = (
    <BasicInfoCard
      userInfo={basic}
      fieldSettings={fieldSettings}
      profileOptions={profileOptions}
      regionTree={regionTree}
      mode={fromProfile ? 'profileEdit' : 'verification'}
      onChange={updateField}
      onChangeMany={updateFields}
      onEditorVisibilityChange={setEditorVisible}
    />
  )

  if (fromProfile) {
    return (
      <VerificationRuntimeBoundary>
        <View
          style={{
            minHeight: '100vh',
            background:
              'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 50%, rgba(248,250,239,0.72) 100%)',
          }}
        >
          <LanhuSubNav title={copy('profile_basic_nav_title')} onBack={handleBack} />
          <ScrollView
            scrollY
            style={{ height: 'calc(100vh - 164rpx)', width: '750rpx' }}
            showScrollbar={false}
          >
            <View
              style={{
                position: 'relative',
                width: '750rpx',
                minHeight: '1848rpx',
                paddingBottom: 'calc(54rpx + env(safe-area-inset-bottom))',
                boxSizing: 'border-box',
              }}
            >
              <View style={{ position: 'absolute', left: '25rpx', top: '62rpx', width: '700rpx' }}>
                <Text
                  style={{
                    display: 'block',
                    color: '#0C285A',
                    fontSize: '48rpx',
                    lineHeight: '67rpx',
                    fontWeight: 800,
                  }}
                >
                  {copy('profile_basic_heading')}
                </Text>
                <Text
                  style={{
                    display: 'block',
                    color: '#999999',
                    fontSize: '26rpx',
                    lineHeight: '38rpx',
                    marginTop: '18rpx',
                  }}
                >
                  {copy('profile_basic_notice')}
                </Text>
              </View>
              {card}
              {!editorVisible ? (
                <View
                  data-role="profile-basic-save"
                  style={{
                    position: 'relative',
                    width: '700rpx',
                    height: '98rpx',
                    margin: '48rpx 25rpx 0',
                    borderRadius: '40rpx',
                    background: saving ? '#C9DDF7' : '#2876FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: saving ? 'none' : '0 12rpx 28rpx rgba(40,118,255,0.18)',
                  }}
                  onClick={saving ? undefined : () => save(false)}
                  hoverClass={saving ? undefined : 'btn-hover'}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: '32rpx',
                      fontWeight: 700,
                      lineHeight: '45rpx',
                    }}
                  >
                    {saving ? copy('common_saving_action') : copy('common_save_action')}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </VerificationRuntimeBoundary>
    )
  }

  return (
    <VerificationRuntimeBoundary>
      <VerificationShell
        stage="basic"
        primaryText={saving ? copy('common_submitting_action') : copy('verification_next_action')}
        primaryActive={!saving}
        onPrimary={editorVisible ? undefined : () => save(true)}
        onBack={handleBack}
        scroll
      >
        {card}
      </VerificationShell>
    </VerificationRuntimeBoundary>
  )
}

async function showError(error: unknown) {
  const title = toTwoLevelRegionErrorMessage(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
