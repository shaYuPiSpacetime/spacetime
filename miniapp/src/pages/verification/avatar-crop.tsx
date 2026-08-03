import { Canvas, Image, MovableArea, MovableView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { resolveAvatarUploadError } from '@/domain/avatarUploadError'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import { getWindowMetrics } from '@/utils/system'
import VerificationRuntimeBoundary from './components/VerificationRuntimeBoundary'

const EXPORT_WIDTH = 1076
const EXPORT_HEIGHT = 1304

interface CropGeometry {
  naturalWidth: number
  naturalHeight: number
  areaWidth: number
  areaHeight: number
  imageWidth: number
  imageHeight: number
  areaLeft: number
  areaTop: number
  initialX: number
  initialY: number
}

interface CropTransform {
  x: number
  y: number
  scale: number
}

export default function VerificationAvatarCropPage() {
  const router = useRouter()
  const copy = usePrd01Store(state => state.copy)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const path = decodeURIComponent(String(router.params.path || ''))
  const source = decodeURIComponent(String(router.params.source || ''))
  const [submitting, setSubmitting] = useState(false)
  const [geometry, setGeometry] = useState<CropGeometry>()
  const transformRef = useRef<CropTransform>({ x: 0, y: 0, scale: 1 })

  useEffect(() => {
    if (!path) return
    void Taro.getImageInfo({ src: path }).then((image) => {
      const windowMetrics = getWindowMetrics()
      const windowWidth = windowMetrics.windowWidth || 375
      const windowHeight = windowMetrics.windowHeight || 667
      const screenScale = windowWidth / 375
      const areaHeight = Math.min(326 * screenScale, Math.max(230 * screenScale, windowHeight - 370 * screenScale))
      const areaWidth = areaHeight * 538 / 652
      const areaLeft = (windowWidth - areaWidth) / 2
      const areaTop = Math.max(160 * screenScale, windowHeight - 172 * screenScale - areaHeight)
      const coverScale = Math.max(areaWidth / image.width, areaHeight / image.height)
      const imageWidth = image.width * coverScale
      const imageHeight = image.height * coverScale
      const initialX = (areaWidth - imageWidth) / 2
      const initialY = (areaHeight - imageHeight) / 2
      transformRef.current = { x: initialX, y: initialY, scale: 1 }
      setGeometry({
        naturalWidth: image.width,
        naturalHeight: image.height,
        areaWidth,
        areaHeight,
        imageWidth,
        imageHeight,
        areaLeft,
        areaTop,
        initialX,
        initialY,
      })
    }).catch(showError)
  }, [path])

  const handleConfirm = async () => {
    if (!path || !geometry || submitting) return
    setSubmitting(true)
    try {
      const sourceOption = profileOptions?.avatarSource?.find(option => option.code === source)
      if (!sourceOption) throw new Error(copy('avatar_source_invalid'))
      const croppedPath = await exportCroppedAvatar(path, geometry, transformRef.current, copy('avatar_crop_export_failed'))
      const uploaded = await prd01Api.uploadAvatar(croppedPath)
      await prd01Api.submitAvatar({ avatarSource: sourceOption.code, avatarUrl: uploaded.url })
      await Taro.redirectTo({ url: '/pages/verification/avatar-review' })
    } catch (error) {
      await showError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <VerificationRuntimeBoundary>
      <View style={{ minHeight: '100vh', background: '#4B4B4B', position: 'relative', overflow: 'hidden' }}>
        {geometry ? (
          <>
            <Image src={path} mode="aspectFill" style={{ position: 'absolute', left: `${geometry.areaLeft - 6}px`, top: `${geometry.areaTop - 63 * getWindowMetrics().windowWidth / 375}px`, width: `${geometry.areaWidth + 12}px`, height: `${geometry.areaHeight + 126 * getWindowMetrics().windowWidth / 375}px`, opacity: 0.38 }} />
            <MovableArea
              style={{ position: 'absolute', left: `${geometry.areaLeft}px`, top: `${geometry.areaTop}px`, width: `${geometry.areaWidth}px`, height: `${geometry.areaHeight}px`, overflow: 'hidden' }}
              scaleArea
            >
              <MovableView
                direction="all"
                x={geometry.initialX}
                y={geometry.initialY}
                scale
                scaleMin={1}
                scaleMax={3}
                scaleValue={1}
                outOfBounds={false}
                style={{ width: `${geometry.imageWidth}px`, height: `${geometry.imageHeight}px` }}
                onChange={(event) => {
                  transformRef.current = { ...transformRef.current, x: event.detail.x, y: event.detail.y }
                }}
                onScale={(event) => {
                  transformRef.current = { x: event.detail.x, y: event.detail.y, scale: event.detail.scale }
                }}
              >
                <Image src={path} mode="scaleToFill" style={{ width: '100%', height: '100%' }} />
              </MovableView>
            </MovableArea>
            <CropFrame geometry={geometry} />
          </>
        ) : null}

        <Text style={{ position: 'absolute', left: '50rpx', top: geometry ? `${geometry.areaTop + geometry.areaHeight + 20}px` : 'auto', width: '650rpx', color: '#FFFFFF', fontSize: '24rpx', lineHeight: '36rpx', textAlign: 'center' }}>
          {copy('avatar_crop_notice')}
        </Text>

        <View style={{ position: 'fixed', left: '0', right: '0', bottom: '0', height: 'calc(124rpx + env(safe-area-inset-bottom))', background: 'rgba(55,55,55,0.92)', zIndex: 20 }}>
          <Text style={{ position: 'absolute', left: '54rpx', top: '38rpx', color: '#FFFFFF', fontSize: '28rpx', fontWeight: 700 }} onClick={() => Taro.redirectTo({ url: '/pages/verification/avatar' })}>
            {copy('common_cancel_action')}
          </Text>
          <View style={{ position: 'absolute', right: '25rpx', top: '24rpx', minWidth: '148rpx', height: '68rpx', borderRadius: '8rpx', background: submitting ? '#7DAAFF' : '#2876FF', padding: '0 20rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void handleConfirm()}>
            <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 700 }}>{copy(submitting ? 'common_submitting_action' : 'common_confirm_action')}</Text>
          </View>
        </View>

        <Canvas canvasId="avatarCropCanvas" style={{ position: 'fixed', left: '-2000px', top: '0', width: `${EXPORT_WIDTH}px`, height: `${EXPORT_HEIGHT}px` }} />
      </View>
    </VerificationRuntimeBoundary>
  )
}

function CropFrame({ geometry }: { geometry: CropGeometry }) {
  const cornerSize = Math.min(21, geometry.areaWidth * 0.08)
  const borderWidth = Math.max(3, geometry.areaWidth * 0.013)
  const corner = (left: number, top: number, rotate: string) => (
    <View style={{ position: 'absolute', left: `${left}px`, top: `${top}px`, width: `${cornerSize}px`, height: `${cornerSize}px`, borderLeft: `${borderWidth}px solid #FFFFFF`, borderTop: `${borderWidth}px solid #FFFFFF`, transform: rotate, zIndex: 5, boxSizing: 'border-box' }} />
  )
  return (
    <View style={{ position: 'absolute', left: `${geometry.areaLeft}px`, top: `${geometry.areaTop}px`, width: `${geometry.areaWidth}px`, height: `${geometry.areaHeight}px`, border: '2rpx dashed rgba(255,255,255,0.82)', boxSizing: 'border-box', pointerEvents: 'none' }}>
      {corner(-borderWidth, -borderWidth, 'rotate(0deg)')}
      {corner(geometry.areaWidth - cornerSize + borderWidth, -borderWidth, 'rotate(90deg)')}
      {corner(geometry.areaWidth - cornerSize + borderWidth, geometry.areaHeight - cornerSize + borderWidth, 'rotate(180deg)')}
      {corner(-borderWidth, geometry.areaHeight - cornerSize + borderWidth, 'rotate(270deg)')}
    </View>
  )
}

async function exportCroppedAvatar(path: string, geometry: CropGeometry, transform: CropTransform, exportFailedMessage: string): Promise<string> {
  const renderedWidth = geometry.imageWidth * transform.scale
  const renderedHeight = geometry.imageHeight * transform.scale
  const x = clamp(transform.x, geometry.areaWidth - renderedWidth, 0)
  const y = clamp(transform.y, geometry.areaHeight - renderedHeight, 0)
  const sourceX = -x / renderedWidth * geometry.naturalWidth
  const sourceY = -y / renderedHeight * geometry.naturalHeight
  const sourceWidth = geometry.areaWidth / renderedWidth * geometry.naturalWidth
  const sourceHeight = geometry.areaHeight / renderedHeight * geometry.naturalHeight
  const context = Taro.createCanvasContext('avatarCropCanvas')
  context.clearRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)
  context.drawImage(path, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)
  await new Promise<void>((resolve) => context.draw(false, resolve))
  const result = await Taro.canvasToTempFilePath({
    canvasId: 'avatarCropCanvas',
    fileType: 'png',
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    destWidth: EXPORT_WIDTH,
    destHeight: EXPORT_HEIGHT,
  })
  if (!result.tempFilePath) throw new Error(exportFailedMessage)
  return result.tempFilePath
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

async function showError(error: unknown) {
  const title = resolveAvatarUploadError(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
