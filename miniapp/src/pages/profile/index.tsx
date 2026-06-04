import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useCallback } from 'react'
import { useProfile } from '@/hooks/useProfile'
import AppTabBar from '@/components/AppTabBar'
import CustomNavBar from '@/components/CustomNavBar'

import cardCoin from '@/assets/profile/card-coin.png'
import cardInvite from '@/assets/profile/card-invite.png'
import iconVip from '@/assets/profile/icon-vip.png'
import iconPost from '@/assets/profile/icon-post.png'
import iconService from '@/assets/profile/icon-service.png'
import iconSettings from '@/assets/profile/icon-settings.png'
import iconCert from '@/assets/profile/icon-cert.png'

/**
 * 我的 — 1:1 Figma node 178:3 (750px ÷ 2 = CSS px)
 *
 * 原生小程序状态栏+胶囊(168px Figma = 84px CSS)由系统提供，
 * H5 下从 y=0 开始渲染，省去等高占位。
 */
export default function ProfilePage() {
  const { data, fetch, goToEditProfile, goToVip, goToCoin, goToInvite, goToMyPosts, goToHelp, goToSettings } = useProfile()
  useEffect(() => { fetch() }, [fetch])

  /** 确保导航栏标题始终显示"我的"（Figma 设计稿导航栏居中标题） */
  const syncNavTitle = useCallback(() => {
    Taro.setNavigationBarTitle({ title: '我的' })
  }, [])
  useEffect(() => { syncNavTitle() }, [syncNavTitle])
  useDidShow(() => { syncNavTitle() })

  const { nickname, avatarUrl, location, age, zodiac, isVerified, membership, likedCount, beLikedCount, visitorCount } = data
  const isVip = membership?.status === 'active'
  const subInfo = [location, age != null ? `${age}岁` : '', zodiac].filter(Boolean).join(' | ')

  return (
    <View style={{ background: '#F5F8FF', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <CustomNavBar bgColor="transparent" />
      <ScrollView scrollY style={{ flex: 1, height: 0, paddingBottom: '52px' }}>

        {/* ─────────────────────────────────────────────────
            Hero 区  背景从导航栏底部无缝衔接（导航栏 bg 已设为 #E3F1FE）
        ───────────────────────────────────────────────── */}
        <View style={{
          background: 'linear-gradient(180deg,#E3F1FE 0%,#EEF5FF 100%)',
          padding: '0 12px 0 12px',
          minHeight: '73px',
        }}>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>

            {/* 头像 + 50% 药丸 */}
            {/* Figma: 位图 x:31,y:186,w:98,h:98 → x:15,y:9,w:49,h:49 */}
            <View style={{ position: 'relative', marginRight: '12px', flexShrink: 0, paddingBottom: '10px' }}>
              <View style={{
                width: '49px', height: '49px', borderRadius: '50%',
                background: '#D0E5FA', border: '3px solid #fff',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {avatarUrl
                  ? <Image src={avatarUrl} style={{ width: '49px', height: '49px' }} mode="aspectFill" />
                  : <Text style={{ fontSize: '18px', color: '#2876FF' }}>{nickname?.charAt(0) ?? '?'}</Text>
                }
              </View>
              {/* 50% 药丸 Figma: x:35,y:261,w:90,h:30 → w:45,h:15 at avatar bottom */}
              <View style={{
                position: 'absolute', bottom: '0', left: '50%', marginLeft: '-22px',
                width: '44px', height: '16px', borderRadius: '8px', background: '#E3F1FE',
                display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* 铅笔图标 (Figma 178:177, 编辑 14×14) */}
                <Image src={iconCert} style={{ width: '7px', height: '7px', marginRight: '2px', opacity: 0.7 }} mode="aspectFit" />
                <Text style={{ fontSize: '9px', color: '#2876FF', fontWeight: '500' }}>50%</Text>
              </View>
            </View>

            {/* 昵称 + 认证 + 编辑 + 位置 */}
            <View style={{ flex: 1, paddingTop: '2px' }}>
              {/* 行1: 昵称 + 认证 badge + 编辑资料 */}
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                  {/* 昵称 Figma: style_LW2IIQ:32px→16px,w500,#333 */}
                  <Text style={{ fontSize: '16px', fontWeight: '500', color: '#333333' }}>{nickname}</Text>
                  {/* 三重认证 Figma: 178:167, bg#E3F1FE, text#5D89DD, 20px→10px */}
                  {isVerified && (
                    <View style={{
                      display: 'flex', flexDirection: 'row', alignItems: 'center',
                      background: '#E3F1FE', borderRadius: '4px',
                      paddingLeft: '5px', paddingRight: '7px', paddingTop: '2px', paddingBottom: '2px',
                    }}>
                      <Image src={iconCert} style={{ width: '12px', height: '12px', marginRight: '2px' }} mode="aspectFit" />
                      <Text style={{ fontSize: '10px', color: '#5D89DD' }}>三重认证</Text>
                    </View>
                  )}
                </View>
                {/* 编辑资料 Figma: style_HUVOPJ:22px→11px,#999 */}
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }} onClick={goToEditProfile}>
                  <Text style={{ fontSize: '11px', color: '#999999' }}>编辑资料</Text>
                  <Text style={{ fontSize: '11px', color: '#999999' }}> ›</Text>
                </View>
              </View>
              {/* 行2: 位置|年龄|星座 Figma: style_XAUHUF:26px→13px,#333 */}
              <Text style={{ fontSize: '13px', color: '#333333', marginTop: '5px' }}>{subInfo}</Text>
            </View>
          </View>
        </View>

        {/* ─────────────────────────────────────────────────
            统计卡片  Figma: x:25,y:314,w:700,h:178 → margin:8 12, h:89px
        ───────────────────────────────────────────────── */}
        <View style={{
          margin: '8px 12px 0',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 1px 13px 0 rgba(227,241,254,1)',
          height: '89px',
          display: 'flex', flexDirection: 'row', alignItems: 'center',
          paddingLeft: '22px', paddingRight: '16px',
        }}>
          {/* 3 列 */}
          <View style={{ flex: 1, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {[
              { count: likedCount,  label: '我喜欢的', badge: ''    },
              { count: beLikedCount, label: '喜欢我的', badge: '45'  },
              { count: visitorCount, label: '最近来访', badge: '99+' },
            ].map((item) => (
              <View key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* 数字 + 红标悬浮 */}
                <View style={{ position: 'relative', display: 'inline-flex' }}>
                  <Text style={{ fontSize: '19px', fontWeight: '600', color: '#333333' }}>{item.count}</Text>
                  {item.badge && (
                    <View style={{
                      position: 'absolute', top: '-2px', right: '-14px',
                      minWidth: '14px', height: '14px', borderRadius: '7px',
                      background: '#EE2525', border: '1px solid #fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      paddingLeft: '2px', paddingRight: '2px',
                    }}>
                      <Text style={{ fontSize: '8px', color: '#fff' }}>{item.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: '12px', color: '#999999', marginTop: '2px' }}>{item.label}</Text>
              </View>
            ))}
          </View>
          {/* 提升人气 Figma: fill#E3F1FE,⚡+提升人气 */}
          <View style={{
            marginLeft: '12px', flexShrink: 0,
            background: '#E3F1FE', borderRadius: '100px',
            paddingLeft: '10px', paddingRight: '12px',
            paddingTop: '5px', paddingBottom: '5px',
            display: 'flex', flexDirection: 'row', alignItems: 'center',
          }} onClick={() => Taro.showToast({ title: '提升人气', icon: 'none' })}>
            <Text style={{ fontSize: '12px', color: '#2876FF', marginRight: '2px' }}>⚡</Text>
            <Text style={{ fontSize: '12px', color: '#2876FF' }}>提升人气</Text>
          </View>
        </View>

        {/* ─────────────────────────────────────────────────
            VIP 横幅  Figma: x:25,y:512,w:700,h:128 → h:64px
        ───────────────────────────────────────────────── */}
        <View style={{
          margin: '8px 12px 0',
          borderRadius: '10px',
          background: 'linear-gradient(90deg,#151515 2%,#484848 98%)',
          height: '64px',
          display: 'flex', flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '14px', paddingRight: '14px',
          overflow: 'hidden', position: 'relative',
        }} onClick={goToVip}>
          {/* 右侧菱形背景装饰（半透明） */}
          <View style={{
            position: 'absolute', right: '80px', top: '-20px',
            width: '80px', height: '80px',
            borderRadius: '4px',
            border: '12px solid rgba(255,201,105,0.12)',
            transform: 'rotate(45deg)',
          }} />
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            {/* Figma: VIP 图标 48×38px → 24×19px */}
            <Image src={iconVip} style={{ width: '24px', height: '19px', marginRight: '8px' }} mode="aspectFit" />
            {/* Figma: style_ADQM2S:28px→14px,w500,#FFC969 */}
            <Text style={{ fontSize: '14px', fontWeight: '500', color: '#FFC969' }}>
              {isVip ? 'VIP会员续费，享尊享特权' : 'VIP会员已过期，开通享尊享特权'}
            </Text>
          </View>
          {/* 立即开通 Figma: w:160,h:48 → 80×24px */}
          <View style={{
            background: '#FFC969', borderRadius: '24px',
            paddingLeft: '14px', paddingRight: '14px',
            height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            flexShrink: 0, marginLeft: '8px',
          }}>
            {/* Figma: style_XAUHUF:26px→13px,#232323 */}
            <Text style={{ fontSize: '13px', fontWeight: '500', color: '#232323' }}>
              {isVip ? '立即续费' : '立即开通'}
            </Text>
          </View>
        </View>

        {/* ─────────────────────────────────────────────────
            功能双卡片 —— 左右布局，描述在各自标题下方（Figma 设计稿要求）
        ───────────────────────────────────────────────── */}
        <View style={{ margin: '8px 12px 0', display: 'flex', flexDirection: 'row', gap: '8px' }}>
          {/* 成家币卡片 */}
          <View style={{ flex: 1, height: '79px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }} onClick={goToCoin}>
            <Image src={cardCoin} style={{ width: '100%', height: '100%', zIndex: 0 }} mode="scaleToFill" />
            <View style={{ position: 'absolute', top: '14px', left: '12px', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
              <Text style={{ fontSize: '14px', fontWeight: '700', color: '#00469F' }}>成家币</Text>
              <Text style={{ fontSize: '10px', color: '#00469F', marginTop: '4px' }}>查看成家币</Text>
            </View>
          </View>

          {/* 邀请好友卡片 */}
          <View style={{ flex: 1, height: '79px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }} onClick={goToInvite}>
            <Image src={cardInvite} style={{ width: '100%', height: '100%', zIndex: 0 }} mode="scaleToFill" />
            <View style={{ position: 'absolute', top: '14px', left: '12px', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
              <Text style={{ fontSize: '14px', fontWeight: '700', color: '#6600AF' }}>邀请好友</Text>
              <Text style={{ fontSize: '10px', color: '#A055C3', marginTop: '4px' }}>免费获得成家币</Text>
            </View>
          </View>
        </View>

        {/* ─────────────────────────────────────────────────
            菜单列表  Figma: x:25,y:838,w:700,h:282 → h:141px
            每行: y 间距 282/3=94 Figma → 47px CSS
        ───────────────────────────────────────────────── */}
        <View style={{
          margin: '8px 12px 0',
          background: '#fff', borderRadius: '12px',
          paddingLeft: '12px', paddingRight: '12px',
        }}>
          {[
            { label: '我的动态', icon: iconPost, onClick: goToMyPosts },
            { label: '帮助与客服', icon: iconService, onClick: goToHelp },
            { label: '设置', icon: iconSettings, onClick: goToSettings },
          ].map((item, idx) => (
            <View key={item.label}>
              <View style={{
                display: 'flex', flexDirection: 'row',
                alignItems: 'center', justifyContent: 'space-between',
                height: '47px',
              }} onClick={item.onClick}>
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  {/* Figma: 图标 30×28px → 15×14px */}
                  <Image src={item.icon} style={{ width: '15px', height: '14px', marginRight: '10px', opacity: 0.7 }} mode="aspectFit" />
                  {/* Figma: style_U456XR:28px→14px,#595F77 */}
                  <Text style={{ fontSize: '14px', color: '#595F77' }}>{item.label}</Text>
                </View>
                {/* 箭头 Figma: 返回图标 20×34px → 10×17px */}
                <Text style={{ fontSize: '16px', color: '#CCCCCC' }}>›</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: '20px' }} />
      </ScrollView>

      <AppTabBar active="profile" />
    </View>
  )
}
