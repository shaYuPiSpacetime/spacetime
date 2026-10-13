import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { createEducationDraft, isEducationSubmissionAllowed, validateEducationDraft } from '@/domain/educationVerification'
import { buildEducationRequest } from '@/domain/prd01Runtime'
import { resolveCommunityImageUploadError } from '@/domain/communityImageUpload'
import { prd01Api } from '@/services/prd01'
import { resolveProtectedFilePreview } from '@/services/protectedFile'
import { usePrd01Store } from '@/stores/prd01Store'
import type { EducationDetail, EducationFormValues, EducationMethod } from '@/types/prd01'
import { getErrorMessage } from '@/utils/errorMessage'
import { emitProfileUpdated } from '@/utils/profileEditEvents'

/** 服务端引用和本地预览按稳定 ID 绑定，替换/删除不依赖数组下标。 */
export interface EducationMaterial {
  id: string
  serverUrl: string
  previewUrl?: string
  previewStatus: 'loading' | 'ready' | 'error'
}

const EDUCATION_MATERIAL_MAX_COUNT = 4

/** 学历重填状态与 I/O：初始化一次草稿，页面返回仅更新服务端资格。 */
export function useEducationVerification(method: EducationMethod, userType: string) {
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const config = usePrd01Store(state => state.config)
  const copy = usePrd01Store(state => state.copy)
  const [detail, setDetail] = useState<EducationDetail>()
  const [draft, setDraft] = useState(() => createEducationDraft(undefined, method, userType))
  const [materials, setMaterials] = useState<EducationMaterial[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [statusError, setStatusError] = useState('')
  const alive = useRef(true)
  const initialized = useRef(false)
  const requestGeneration = useRef(0)
  const itemSequence = useRef(0)
  const previewGeneration = useRef(new Map<string, number>())
  const detailRef = useRef<EducationDetail>()
  const draftRef = useRef(draft)
  const materialsRef = useRef(materials)
  const operations = useRef({ uploading: false, submitting: false })
  const statusErrorRef = useRef('')
  const maxMaterialCount = Math.min(EDUCATION_MATERIAL_MAX_COUNT, Math.max(1, config?.uploadLimits.education.maxCount || 4))

  useEffect(() => { alive.current = true; return () => { alive.current = false; requestGeneration.current++ } }, [])

  function setField<K extends keyof EducationFormValues>(field: K, value: EducationFormValues[K]) {
    if (!alive.current || operations.current.submitting) return
    draftRef.current = { ...draftRef.current, [field]: value }
    setDraft(draftRef.current)
  }

  function updateMaterials(change: (current: EducationMaterial[]) => EducationMaterial[]) {
    if (!alive.current) return
    materialsRef.current = change(materialsRef.current)
    setMaterials(materialsRef.current)
    draftRef.current = { ...draftRef.current, materialUrls: materialsRef.current.map(item => item.serverUrl) }
    setDraft(draftRef.current)
  }

  async function previewMaterial(item: EducationMaterial) {
    const generation = (previewGeneration.current.get(item.id) || 0) + 1
    previewGeneration.current.set(item.id, generation)
    updateMaterials(current => current.map(value => value.id === item.id ? { ...value, previewStatus: 'loading' } : value))
    try {
      const previewUrl = await resolveProtectedFilePreview(item.serverUrl)
      if (!alive.current || previewGeneration.current.get(item.id) !== generation) return
      updateMaterials(current => current.map(value => value.id === item.id && value.serverUrl === item.serverUrl
        ? { ...value, previewUrl, previewStatus: 'ready' } : value))
    } catch (error) {
      if (!alive.current || previewGeneration.current.get(item.id) !== generation) return
      updateMaterials(current => current.map(value => value.id === item.id ? { ...value, previewStatus: 'error' } : value))
      // 下载服务保留鉴权；401 再走统一请求确认登录失效，不将其改成公网预览。
      if (/401\b/.test(getErrorMessage(error))) {
        try { await prd01Api.getVerificationStatus() } catch { /* 统一 request 已处理登录失效。 */ }
      }
    }
  }

  async function loadDetail() {
    const generation = ++requestGeneration.current
    const value = await prd01Api.getEducation()
    if (!alive.current || generation !== requestGeneration.current) return
    detailRef.current = value
    setDetail(value)
    statusErrorRef.current = ''
    setStatusError('')
    if (initialized.current) return
    initialized.current = true
    draftRef.current = createEducationDraft(value, method, userType)
    setDraft(draftRef.current)
    const items: EducationMaterial[] = (draftRef.current.materialUrls || []).map(serverUrl => ({
      id: `education-material-${++itemSequence.current}`, serverUrl, previewStatus: 'loading',
    }))
    updateMaterials(() => items)
    // 材料预览不参与整页加载门禁；任何一张失败都不阻止重填。
    items.forEach(item => { void previewMaterial(item) })
  }

  async function refreshStatus() {
    const generation = requestGeneration.current + 1
    try { await loadDetail() } catch (error) {
      if (!alive.current || generation !== requestGeneration.current) return
      statusErrorRef.current = getErrorMessage(error, copy('common_load_failed_message'))
      setStatusError(statusErrorRef.current)
    }
  }

  useDidShow(() => { if (initialized.current) void refreshStatus() })

  const canEdit = isEducationSubmissionAllowed(detail) && !statusError && !submitting
  const issues = attempted ? validateEducationDraft(method, draft, profileOptions, maxMaterialCount) : []

  function removeMaterial(id: string) {
    if (!canEdit || operations.current.uploading) return
    previewGeneration.current.delete(id)
    updateMaterials(current => current.filter(item => item.id !== id))
  }

  async function upload(replaceId?: string) {
    if (!isEducationSubmissionAllowed(detailRef.current) || statusErrorRef.current || operations.current.uploading || operations.current.submitting) return
    const existing = replaceId ? materialsRef.current.find(item => item.id === replaceId) : undefined
    if (replaceId && !existing) return
    const remaining = existing ? 1 : Math.max(0, maxMaterialCount - materialsRef.current.length)
    if (!remaining) { await Taro.showToast({ title: copy('education_upload_limit_reached'), icon: 'none' }); return }
    operations.current.uploading = true
    setUploading(true)
    try {
      const result = await Taro.chooseImage({ count: remaining, sizeType: ['original'], sourceType: ['album', 'camera'] })
      for (const filePath of result.tempFilePaths.slice(0, remaining)) {
        const uploaded = await prd01Api.uploadEducation(filePath)
        if (!alive.current) return
        const item: EducationMaterial = { id: `education-material-${++itemSequence.current}`, serverUrl: uploaded.url, previewUrl: filePath, previewStatus: 'ready' }
        updateMaterials(current => existing ? current.map(value => value.id === replaceId ? item : value) : [...current, item])
        if (existing) previewGeneration.current.delete(existing.id)
      }
    } catch (error) {
      if (!alive.current) return
      const message = error && typeof error === 'object' && 'errMsg' in error ? String(error.errMsg) : ''
      if (!/chooseImage:fail cancel/i.test(message)) await Taro.showToast({ title: resolveCommunityImageUploadError(error), icon: 'none' })
    } finally {
      operations.current.uploading = false
      if (alive.current) setUploading(false)
    }
  }

  async function submit() {
    if (operations.current.submitting) return
    if (!isEducationSubmissionAllowed(detailRef.current) || statusErrorRef.current) {
      await Taro.showToast({ title: statusErrorRef.current || detailRef.current?.blockedReason || copy('common_load_failed_message'), icon: 'none' })
      return
    }
    if (operations.current.uploading) { await Taro.showToast({ title: copy('common_uploading_action'), icon: 'none' }); return }
    setAttempted(true)
    const validation = validateEducationDraft(method, draftRef.current, profileOptions, maxMaterialCount)
    if (validation.length) {
      const issue = validation[0]
      await Taro.showToast({ title: copy(issue.copyKey).replace('{max}', String(maxMaterialCount)), icon: 'none' })
      return issue
    }
    operations.current.submitting = true
    setSubmitting(true)
    let succeeded = false
    try {
      const status = await prd01Api.submitEducation(buildEducationRequest(method, draftRef.current))
      if (!alive.current) return
      succeeded = true
      // 响应已收单即关闭本页再次提交；导航失败也不得重复 POST。
      requestGeneration.current++
      detailRef.current = { ...detailRef.current, canSubmit: false, auditStatus: status.educationStatus }
      setDetail(detailRef.current)
      emitProfileUpdated({ type: 'verification', status })
      await Taro.redirectTo({ url: '/pages/verification/education-submit-success' })
    } catch (error) {
      if (!alive.current) return
      await Taro.showToast({ title: getErrorMessage(error), icon: 'none' })
      if (!succeeded) await refreshStatus()
    } finally {
      operations.current.submitting = false
      if (alive.current) setSubmitting(false)
    }
  }

  return {
    detail, draft, materials, issues, canEdit, uploading, submitting, statusError, maxMaterialCount,
    setField, loadDetail, refreshStatus, upload, removeMaterial, submit,
    retryPreview: (id: string) => { const item = materialsRef.current.find(value => value.id === id); if (item) void previewMaterial(item) },
  }
}
