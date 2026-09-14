import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef } from 'react'
import {
  clampRangeValue,
  rangeValueFromPointer,
  selectRangeThumb,
} from '@/domain/dualRangeSlider'

type RangeThumb = 'low' | 'high'
type TrackRect = { left: number; width: number }
type PendingTouch = { sequence: number; clientX: number; ended: boolean }

interface DualRangeSliderProps {
  min: number
  max: number
  low: number
  high: number
  step?: number
  disabled?: boolean
  activeColor?: string
  backgroundColor?: string
  onLowChange: (value: number) => void
  onHighChange: (value: number) => void
}

let sliderSeed = 0

function pointerClientX(event: any) {
  return Number(event?.touches?.[0]?.clientX ?? event?.changedTouches?.[0]?.clientX)
}

export default function DualRangeSlider({
  min,
  max,
  low,
  high,
  step = 1,
  disabled = false,
  activeColor = '#2876FF',
  backgroundColor = '#F1F2F4',
  onLowChange,
  onHighChange,
}: DualRangeSliderProps) {
  const idRef = useRef('dual-range-slider')
  if (idRef.current === 'dual-range-slider') {
    sliderSeed += 1
    idRef.current = `dual-range-slider-${sliderSeed}`
  }
  const activeThumbRef = useRef<RangeThumb | null>(null)
  const trackRectRef = useRef<TrackRect | null>(null)
  const touchSequenceRef = useRef(0)
  const pendingTouchRef = useRef<PendingTouch | null>(null)
  const mountedRef = useRef(true)
  const span = Math.max(1, max - min)
  const lowPercent = ((clampRangeValue(low, min, max, step) - min) / span) * 100
  const highPercent = ((clampRangeValue(high, min, max, step) - min) / span) * 100

  const updateFromPointer = (clientX: number, thumb?: RangeThumb | null) => {
    const rect = trackRectRef.current
    if (!rect || !Number.isFinite(clientX)) return
    const value = rangeValueFromPointer(clientX, rect.left, rect.width, min, max, step)
    const target = thumb || activeThumbRef.current || selectRangeThumb(value, low, high)
    if (!target) return
    activeThumbRef.current = target
    if (target === 'low') {
      onLowChange(Math.min(value, high))
    } else {
      onHighChange(Math.max(value, low))
    }
  }

  const selectThumbForPointer = (clientX: number, rect: TrackRect) =>
    selectRangeThumb(
      rangeValueFromPointer(clientX, rect.left, rect.width, min, max, step),
      low,
      high
    )

  const measureTrack = (onMeasured?: (rect: TrackRect) => void) => {
    Taro.createSelectorQuery()
      .select(`#${idRef.current}-track`)
      .boundingClientRect(rect => {
        if (!mountedRef.current || !rect || Array.isArray(rect)) return
        if (!Number.isFinite(rect.left) || !Number.isFinite(rect.width) || rect.width <= 0) return
        const measuredRect = { left: rect.left, width: rect.width }
        trackRectRef.current = measuredRect
        onMeasured?.(measuredRect)
      })
      .exec()
  }

  useEffect(() => {
    mountedRef.current = true
    void measureTrack()
    return () => {
      mountedRef.current = false
      touchSequenceRef.current += 1
      pendingTouchRef.current = null
      activeThumbRef.current = null
    }
  }, [])

  const handleTouchStart = (event: any) => {
    if (disabled) return
    event.stopPropagation?.()
    const clientX = pointerClientX(event)
    if (!Number.isFinite(clientX)) return
    activeThumbRef.current = null
    touchSequenceRef.current += 1
    const touchSequence = touchSequenceRef.current
    pendingTouchRef.current = { sequence: touchSequence, clientX, ended: false }
    const trackRect = trackRectRef.current
    if (trackRect) {
      const thumb = selectThumbForPointer(clientX, trackRect)
      activeThumbRef.current = thumb
      updateFromPointer(clientX, thumb)
      return
    }
    measureTrack(rect => {
      const pendingTouch = pendingTouchRef.current
      if (!pendingTouch || pendingTouch.sequence !== touchSequence) return
      const thumb = selectThumbForPointer(pendingTouch.clientX, rect)
      activeThumbRef.current = thumb
      updateFromPointer(pendingTouch.clientX, thumb)
      if (pendingTouch.ended) {
        pendingTouchRef.current = null
        activeThumbRef.current = null
      }
    })
  }

  const handleTouchMove = (event: any) => {
    if (disabled) return
    event.stopPropagation?.()
    const clientX = pointerClientX(event)
    if (!Number.isFinite(clientX)) return
    if (pendingTouchRef.current) pendingTouchRef.current.clientX = clientX
    updateFromPointer(clientX)
  }

  const handleTouchCancel = () => {
    touchSequenceRef.current += 1
    pendingTouchRef.current = null
    activeThumbRef.current = null
  }

  const clearActiveTouch = (event: any) => {
    if (disabled) return
    const pendingTouch = pendingTouchRef.current
    const clientX = pointerClientX(event)
    if (pendingTouch && Number.isFinite(clientX)) pendingTouch.clientX = clientX
    if (trackRectRef.current) {
      if (Number.isFinite(clientX)) updateFromPointer(clientX)
      pendingTouchRef.current = null
      activeThumbRef.current = null
      return
    }
    if (pendingTouch) pendingTouch.ended = true
    activeThumbRef.current = null
  }

  return (
    <View
      id={idRef.current}
      catchMove={!disabled}
      role="slider"
      aria-label={`范围 ${low} 至 ${high}${disabled ? '，不可调整' : ''}`}
      aria-disabled={disabled}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={clearActiveTouch}
      onTouchCancel={handleTouchCancel}
      style={{ position: 'relative', height: '88rpx', opacity: disabled ? 0.45 : 1 }}
    >
      <View
        id={`${idRef.current}-track`}
        style={{ position: 'absolute', left: '18rpx', right: '18rpx', top: '41rpx', height: '6rpx' }}
      >
        <View
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '999rpx',
            background: backgroundColor,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: `${lowPercent}%`,
            right: `${100 - highPercent}%`,
            top: 0,
            bottom: 0,
            borderRadius: '999rpx',
            background: activeColor,
          }}
        />
        {[
          { key: 'low', percent: lowPercent },
          { key: 'high', percent: highPercent },
        ].map(item => (
          <View
            key={item.key}
            style={{
              position: 'absolute',
              left: `${item.percent}%`,
              top: '3rpx',
              width: '34rpx',
              height: '34rpx',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: '#FFFFFF',
              boxShadow: '0 2rpx 10rpx rgba(40, 118, 255, 0.28)',
              border: `2rpx solid ${activeColor}`,
              boxSizing: 'border-box',
            }}
          />
        ))}
      </View>
    </View>
  )
}
