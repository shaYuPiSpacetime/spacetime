import { Camera, CoverView, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'

interface EducationCameraOverlayProps {
  visible: boolean
  onCancel: () => void
  onCaptured: (filePath: string) => void | Promise<void>
}

/** 学历材料页内相机：用固定黑色底层承接初始化，避免系统相机切页时白黑闪烁。 */
export default function EducationCameraOverlay({ visible, onCancel, onCaptured }: EducationCameraOverlayProps) {
  const alive = useRef(true)
  const [ready, setReady] = useState(false)
  const [taking, setTaking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    alive.current = true
    if (visible) {
      setReady(false)
      setTaking(false)
      setErrorMessage('')
    }
    return () => { alive.current = false }
  }, [visible])

  if (!visible) return null

  const takePhoto = () => {
    if (!ready || taking || errorMessage) return
    setTaking(true)
    Taro.createCameraContext().takePhoto({
      quality: 'high',
      success: result => {
        if (!alive.current || !result.tempImagePath) return
        void Promise.resolve(onCaptured(result.tempImagePath)).finally(() => {
          if (alive.current) setTaking(false)
        })
      },
      fail: result => {
        if (!alive.current) return
        setTaking(false)
        void Taro.showToast({ title: result.errMsg || '拍照失败，请重试', icon: 'none' })
      },
    })
  }

  return (
    <View style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000000' }}>
      <Camera
        mode="normal"
        resolution="high"
        devicePosition="back"
        flash="off"
        onInitDone={() => setReady(true)}
        onError={event => {
          const detail = event.detail as { errMsg?: string }
          setErrorMessage(detail?.errMsg || '无法使用相机，请检查相机权限')
        }}
        style={{ width: '100vw', height: '100vh', background: '#000000' }}
      >
        <CoverView style={{ position: 'absolute', left: '28rpx', top: '76rpx', minWidth: '112rpx', height: '72rpx', lineHeight: '72rpx', color: '#FFFFFF', fontSize: '28rpx', textAlign: 'center', background: 'rgba(0,0,0,0.38)', borderRadius: '36rpx' }} onClick={onCancel}>
          取消
        </CoverView>
        {!ready && !errorMessage ? (
          <CoverView style={{ position: 'absolute', left: 0, top: '46vh', width: '100vw', color: '#FFFFFF', fontSize: '26rpx', textAlign: 'center' }}>
            相机准备中
          </CoverView>
        ) : null}
        {errorMessage ? (
          <CoverView style={{ position: 'absolute', left: '75rpx', top: '40vh', width: '600rpx', color: '#FFFFFF', fontSize: '26rpx', lineHeight: '40rpx', textAlign: 'center' }}>
            {errorMessage}
          </CoverView>
        ) : null}
        <CoverView style={{ position: 'absolute', left: 0, bottom: '84rpx', width: '100vw', height: '132rpx', textAlign: 'center' }}>
          <CoverView
            style={{ display: 'inline-block', width: '116rpx', height: '116rpx', borderRadius: '58rpx', border: '8rpx solid rgba(255,255,255,0.86)', background: ready && !taking && !errorMessage ? '#FFFFFF' : 'rgba(255,255,255,0.38)', boxSizing: 'border-box' }}
            onClick={takePhoto}
          />
        </CoverView>
      </Camera>
    </View>
  )
}
