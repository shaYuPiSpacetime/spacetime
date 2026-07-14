import { Input, Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { BasicProfile, ProfileFieldSetting, ProfileOptionKey, RegionOption } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'

const FIELD_OPTION_KEYS: Partial<Record<string, ProfileOptionKey>> = {
  gender: 'gender', identity: 'identity', educationLevel: 'educationLevel',
  industry: 'industry', occupation: 'occupation', annualIncome: 'annualIncome',
  maritalStatus: 'maritalStatus',
}
const REGION_FIELDS = new Set([
  'locationProvince', 'locationCity', 'locationDistrict',
  'hometownProvince', 'hometownCity', 'hometownDistrict',
])

export default function ProfileEditPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const copy = usePrd01Store(state => state.copy)
  const loadLocations = usePrd01Store(state => state.locations)
  const [basic, setBasic] = useState<BasicProfile>({})
  const [datingGoal, setDatingGoal] = useState('')
  const [emotionalStatus, setEmotionalStatus] = useState('')
  const [wechatId, setWechatId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        const [basicResult, home, wechat] = await Promise.all([
          prd01Api.getBasicProfile(), prd01Api.getHomeDetail(), prd01Api.getWechatId(),
        ])
        setBasic(basicResult)
        setDatingGoal(String(home.profile.datingGoal || ''))
        setEmotionalStatus(String(home.profile.emotionalStatus || ''))
        setWechatId(wechat || '')
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  const settings = (basic.fieldSettings || []).filter(item => item.visible)
  const updateField = (fieldId: string, value: unknown) => setBasic(current => ({ ...current, [fieldId]: value }))

  const saveBasic = async () => {
    if (saving) return
    setSaving(true)
    try {
      const payload = Object.fromEntries(settings.map(item => [item.fieldId, basic[item.fieldId]]))
      const result = await prd01Api.saveBasicProfile(payload)
      setBasic(result)
      await Taro.showToast({ title: copy('profile_save_success'), icon: 'success' })
    } catch (error) {
      await showError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ minHeight: '100vh', background: '#F3F7FB' }}>
      <LanhuSubNav title={copy('profile_edit_title')} onBack={navigateBackOrRedirect} />
      <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)' }} showScrollbar={false}>
        <View style={{ width: '700rpx', margin: '0 auto', padding: '28rpx 0 180rpx' }}>
          <SectionTitle text={copy('profile_basic_section_title')} />
          <View style={{ borderRadius: '20rpx', background: '#FFFFFF', padding: '12rpx 28rpx 28rpx' }}>
            {settings.filter(item => !REGION_FIELDS.has(item.fieldId)).map(setting => (
              <DynamicField key={setting.fieldId} setting={setting} value={basic[setting.fieldId]} options={FIELD_OPTION_KEYS[setting.fieldId] ? profileOptions?.[FIELD_OPTION_KEYS[setting.fieldId]!] || [] : []} minAge={basic.minAge} maxAge={basic.maxAge} onChange={value => updateField(setting.fieldId, value)} copy={copy} />
            ))}
            {settings.some(item => item.fieldId.startsWith('location')) ? (
              <RegionEditor title={copy('profile_location_label')} prefix="location" values={basic} loadLocations={loadLocations} onChange={updateField} copy={copy} />
            ) : null}
            {settings.some(item => item.fieldId.startsWith('hometown')) ? (
              <RegionEditor title={copy('profile_hometown_label')} prefix="hometown" values={basic} loadLocations={loadLocations} onChange={updateField} copy={copy} />
            ) : null}
          </View>
          <ActionButton text={copy(saving ? 'common_submitting_action' : 'profile_save_action')} onClick={() => void saveBasic()} />

          <SectionTitle text={copy('profile_extended_section_title')} />
          <View style={{ borderRadius: '20rpx', background: '#FFFFFF', padding: '12rpx 28rpx 28rpx' }}>
            <IndependentPicker label={copy('profile_dating_goal_label')} value={datingGoal} options={profileOptions?.datingGoal || []} onSelect={async option => { try { await prd01Api.saveDatingGoal(option.code); setDatingGoal(option.code) } catch (error) { await showError(error) } }} />
            <IndependentPicker label={copy('profile_emotional_status_label')} value={emotionalStatus} options={profileOptions?.emotionalStatus || []} onSelect={async option => { try { await prd01Api.saveEmotionalStatus(option.code); setEmotionalStatus(option.code) } catch (error) { await showError(error) } }} />
            <InputRow label={copy('profile_wechat_label')} value={wechatId} placeholder={copy('profile_wechat_placeholder')} onInput={setWechatId} />
            <ActionButton text={copy('profile_wechat_save_action')} onClick={async () => { try { await prd01Api.saveWechatId(wechatId.trim()); await Taro.showToast({ title: copy('profile_save_success'), icon: 'success' }) } catch (error) { await showError(error) } }} compact />
            <NavigationRow label={copy('profile_tags_entry')} route="/pages/profile-edit/tags" />
            <NavigationRow label={copy('profile_intro_entry')} route="/pages/profile-edit/intro" />
            <NavigationRow label={copy('profile_about_entry')} route="/pages/profile-edit/about" />
            <NavigationRow label={copy('profile_song_entry')} route="/pages/profile-edit/songs" />
            <NavigationRow label={copy('profile_album_entry')} route="/pages/profile-edit/albums" />
            <NavigationRow label={copy('profile_background_entry')} route="/pages/profile-edit/background" />
            <NavigationRow label={copy('profile_voice_entry')} route="/pages/profile-edit/voice" />
            <NavigationRow label={copy('profile_certification_entry')} route="/pages/verification/my-certification" />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function DynamicField({ setting, value, options, minAge, maxAge, onChange, copy }: { setting: ProfileFieldSetting; value: unknown; options: Array<{ code: string; label: string }>; minAge?: number; maxAge?: number; onChange: (value: unknown) => void; copy: (key: string) => string }) {
  const label = `${setting.label || ''}${setting.required ? copy('common_required_mark') : ''}`
  if (options.length > 0) {
    const selected = options.find(option => option.code === value)
    return <Picker mode="selector" range={options.map(option => option.label)} onChange={event => { const option = options[Number(event.detail.value)]; if (option) onChange(option.code) }}><DisplayRow label={label} value={selected?.label || copy('common_select_placeholder')} /></Picker>
  }
  if (setting.fieldType === 'date') {
    const dates = birthdayRange(minAge, maxAge)
    return <Picker mode="date" value={String(value || dates.end)} start={dates.start} end={dates.end} onChange={event => onChange(event.detail.value)}><DisplayRow label={label} value={String(value || copy('common_select_placeholder'))} /></Picker>
  }
  return <InputRow label={label} value={value == null ? '' : String(value)} placeholder={copy('profile_input_placeholder')} type={setting.fieldType === 'number' ? 'number' : 'text'} onInput={next => onChange(setting.fieldType === 'number' && next ? Number(next) : next)} />
}

function RegionEditor({ title, prefix, values, loadLocations, onChange, copy }: { title: string; prefix: 'location' | 'hometown'; values: BasicProfile; loadLocations: (parentCode?: string) => Promise<RegionOption[]>; onChange: (field: string, value: unknown) => void; copy: (key: string) => string }) {
  const [provinces, setProvinces] = useState<RegionOption[]>([])
  const [cities, setCities] = useState<RegionOption[]>([])
  const [districts, setDistricts] = useState<RegionOption[]>([])
  const provinceCode = String(values[`${prefix}Province`] || '')
  const cityCode = String(values[`${prefix}City`] || '')
  const districtCode = String(values[`${prefix}District`] || '')

  useEffect(() => { void (async () => { const root = await loadLocations(); setProvinces(root); if (provinceCode) { const nextCities = await loadLocations(provinceCode); setCities(nextCities); if (cityCode) setDistricts(await loadLocations(cityCode)) } })().catch(showError) }, [])

  const selector = (label: string, options: RegionOption[], value: string, field: string, onSelected?: (option: RegionOption) => Promise<void>) => (
    <Picker mode="selector" disabled={options.length === 0} range={options.map(item => item.label)} onChange={event => { const option = options[Number(event.detail.value)]; if (!option) return; onChange(field, option.code); if (onSelected) void onSelected(option) }}><DisplayRow label={label} value={options.find(item => item.code === value)?.label || copy('common_select_placeholder')} /></Picker>
  )

  return <View><Text style={{ display: 'block', color: '#0C285A', fontSize: '28rpx', fontWeight: 700, marginTop: '28rpx' }}>{title}</Text>{selector(copy('profile_province_label'), provinces, provinceCode, `${prefix}Province`, async option => { onChange(`${prefix}City`, ''); onChange(`${prefix}District`, ''); setCities(await loadLocations(option.code)); setDistricts([]) })}{selector(copy('profile_city_label'), cities, cityCode, `${prefix}City`, async option => { onChange(`${prefix}District`, ''); setDistricts(option.leaf ? [] : await loadLocations(option.code)) })}{selector(copy('profile_district_label'), districts, districtCode, `${prefix}District`)}</View>
}

function IndependentPicker({ label, value, options, onSelect }: { label: string; value: string; options: Array<{ code: string; label: string }>; onSelect: (option: { code: string; label: string }) => void | Promise<void> }) {
  const selected = options.find(option => option.code === value)
  return <Picker mode="selector" range={options.map(option => option.label)} onChange={event => { const option = options[Number(event.detail.value)]; if (option) void onSelect(option) }}><DisplayRow label={label} value={selected?.label || ''} /></Picker>
}

function DisplayRow({ label, value }: { label: string; value: string }) {
  return <View style={{ minHeight: '92rpx', borderBottom: '2rpx solid #F0F2F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: '#0C285A', fontSize: '27rpx' }}>{label}</Text><Text style={{ color: value ? '#333333' : '#999999', fontSize: '27rpx' }}>{value}</Text></View>
}

function InputRow({ label, value, placeholder, type = 'text', onInput }: { label: string; value: string; placeholder: string; type?: 'text' | 'number'; onInput: (value: string) => void }) {
  return <View style={{ minHeight: '92rpx', borderBottom: '2rpx solid #F0F2F6', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#0C285A', fontSize: '27rpx', width: '250rpx' }}>{label}</Text><Input type={type} value={value} placeholder={placeholder} placeholderStyle="color:#999999;font-size:27rpx;text-align:right" onInput={event => { onInput(event.detail.value); return event.detail.value }} style={{ flex: 1, color: '#333333', fontSize: '27rpx', textAlign: 'right' }} /></View>
}

function NavigationRow({ label, route }: { label: string; route: string }) {
  return <View style={{ minHeight: '92rpx', borderBottom: '2rpx solid #F0F2F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => Taro.navigateTo({ url: route })}><Text style={{ color: '#0C285A', fontSize: '27rpx' }}>{label}</Text><Text style={{ color: '#999999', fontSize: '40rpx' }}>›</Text></View>
}

function SectionTitle({ text }: { text: string }) { return <Text style={{ display: 'block', color: '#0C285A', fontSize: '34rpx', fontWeight: 800, margin: '30rpx 8rpx 20rpx' }}>{text}</Text> }
function ActionButton({ text, onClick, compact = false }: { text: string; onClick: () => void; compact?: boolean }) { return <View style={{ height: compact ? '76rpx' : '96rpx', borderRadius: '24rpx', background: '#2876FF', marginTop: '24rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClick}><Text style={{ color: '#FFFFFF', fontSize: compact ? '28rpx' : '34rpx', fontWeight: 700 }}>{text}</Text></View> }

function birthdayRange(minAge?: number, maxAge?: number) {
  const now = new Date()
  const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return { start: format(new Date(now.getFullYear() - (maxAge || 0), now.getMonth(), now.getDate())), end: format(new Date(now.getFullYear() - (minAge || 0), now.getMonth(), now.getDate())) }
}

async function showError(error: unknown) { const title = error instanceof Error ? error.message : String(error); if (title) await Taro.showToast({ title, icon: 'none' }) }
