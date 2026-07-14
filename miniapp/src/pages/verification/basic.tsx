import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { useLogin } from '@/hooks/useLogin'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { BasicProfile, ProfileFieldSetting, RegionOption } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'
import VerificationShell from './components/VerificationShell'
import BasicInfoCard from './components/BasicInfoCard'

type RegionOptions = Record<string, RegionOption[]>

export default function VerificationBasicPage() {
  const router = useRouter()
  const { enterHome } = useLogin()
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const loadLocations = usePrd01Store(state => state.locations)
  const [basic, setBasic] = useState<BasicProfile>({})
  const [fieldSettings, setFieldSettings] = useState<ProfileFieldSetting[]>([])
  const [regionOptions, setRegionOptions] = useState<RegionOptions>({})
  const [saving, setSaving] = useState(false)
  const fromProfile = router.params.from === 'profile'

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        const result = await prd01Api.getBasicProfile()
        setBasic(result)
        setFieldSettings((result.fieldSettings || usePrd01Store.getState().config?.fieldSettings || []).filter(item => item.visible))
        setRegionOptions(await loadRegionOptions(result, loadLocations))
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
    void Taro.showModal({
      title: '暂不认证',
      content: '可以稍后再完善认证资料，是否先进入首页？',
      confirmText: '进入首页',
      cancelText: '继续认证',
      success: (res) => {
        if (res.confirm) void enterHome()
      },
    })
  }

  const updateField = async (fieldId: string, value: unknown) => {
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

    const next = { ...basic, ...patch }
    setBasic(next)
    if (fieldId.includes('Province') || fieldId.includes('City')) {
      setRegionOptions(await loadRegionOptions(next, loadLocations))
    }
  }

  const save = async (continueVerification: boolean) => {
    if (saving) return
    setSaving(true)
    try {
      const payload = Object.fromEntries(fieldSettings.map(setting => [setting.fieldId, basic[setting.fieldId]]))
      const result = await prd01Api.saveBasicProfile(payload)
      setBasic(result)
      await Taro.showToast({ title: '保存成功', icon: 'success' })
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
      regionOptions={regionOptions}
      mode={fromProfile ? 'profileEdit' : 'verification'}
      onChange={updateField}
    />
  )

  if (fromProfile) {
    return (
      <View style={{ minHeight: '100vh', background: 'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 50%, rgba(248,250,239,0.72) 100%)' }}>
        <LanhuSubNav title="基本资料" onBack={handleBack} />
        <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)', width: '750rpx' }} showScrollbar={false}>
          <View style={{ position: 'relative', width: '750rpx', minHeight: '1848rpx', paddingBottom: '180rpx', boxSizing: 'border-box' }}>
            <View style={{ position: 'absolute', left: '25rpx', top: '62rpx', width: '700rpx' }}>
              <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', lineHeight: '67rpx', fontWeight: 800 }}>完善资料</Text>
              <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '38rpx', marginTop: '18rpx' }}>时空邂逅是一个严肃、靠谱的交友平台，请认真填写资料</Text>
            </View>
            {card}
          </View>
        </ScrollView>
        <View onClick={() => void save(false)} hoverClass="btn-hover" style={{ position: 'fixed', left: '25rpx', bottom: '48rpx', width: '700rpx', height: '98rpx', borderRadius: '20rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12rpx 28rpx rgba(40,118,255,0.24)' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '36rpx', lineHeight: '50rpx', fontWeight: 500 }}>{saving ? '保存中...' : '保存'}</Text>
        </View>
      </View>
    )
  }

  return (
    <VerificationShell
      stage="basic"
      primaryText={saving ? '保存中...' : '继续认证'}
      onPrimary={() => save(true)}
      onBack={handleBack}
      scroll
    >
      {card}
    </VerificationShell>
  )
}

async function loadRegionOptions(
  basic: BasicProfile,
  loadLocations: (parentCode?: string) => Promise<RegionOption[]>
): Promise<RegionOptions> {
  const roots = await loadLocations()
  const result: RegionOptions = {
    locationProvince: roots,
    hometownProvince: roots,
    locationCity: [],
    locationDistrict: [],
    hometownCity: [],
    hometownDistrict: [],
  }
  const pairs = [
    ['locationProvince', 'locationCity', 'locationDistrict'],
    ['hometownProvince', 'hometownCity', 'hometownDistrict'],
  ] as const
  for (const [provinceField, cityField, districtField] of pairs) {
    const provinceCode = String(basic[provinceField] || '')
    if (!provinceCode) continue
    result[cityField] = await loadLocations(provinceCode)
    const cityCode = String(basic[cityField] || '')
    if (cityCode) result[districtField] = await loadLocations(cityCode)
  }
  return result
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
