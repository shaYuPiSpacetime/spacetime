/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('协议弹窗打开时原生视频和 CoverView Logo 退出覆盖层', () => {
  const login = read('src/pages/login/index.tsx')

  assert.match(login, /!videoUnavailable && !showDialog && \(\s*<Video/, '协议弹窗打开时必须卸载原生 Video 层')
  assert.match(login, /!videoUnavailable && !showDialog && \(/, '协议弹窗打开时必须卸载原生 CoverView Logo')
  assert.match(login, /showDialog && \([\s\S]{0,700}className="login-brand-logo login-brand-logo--dialog"/, '协议弹窗背景需要使用可被普通遮罩覆盖的同坐标 Logo')
  assert.match(login, /className="login-agreement-dialog[\s\S]{0,220}zIndex:\s*100/, '协议弹窗必须声明高于普通登录内容的明确层级')
  assert.match(login, /id="login-agreement-card"/, '协议弹窗卡片必须提供微信运行态几何验收节点')
})

test('选择微信登录后点击协议同意直接触发原生账号选择', () => {
  const login = read('src/pages/login/index.tsx')
  const agreementDialog = login.match(/function AgreementDialog[\s\S]*?\n}\n\ninterface LoginMethodSheetProps/)?.[0]

  assert.ok(agreementDialog, '无法定位协议弹窗组件')
  assert.match(
    agreementDialog,
    /selectedMethod === 'wechat'[\s\S]*?<Button[\s\S]*?openType="getPhoneNumber"[\s\S]*?onGetPhoneNumber=\{onWechatPhoneLogin\}/,
    '微信登录的协议同意按钮必须直接承载 getPhoneNumber，才能在同一次点击中弹出系统账号选择'
  )
  assert.match(
    login,
    /const handleAgreementWechatPhoneStart = \(\) => \{[\s\S]*?setAgreementAccepted\(true\)[\s\S]*?setAgreementWechatAuthorizing\(true\)/,
    '同意按钮按下时必须先记录协议状态并隐藏协议视觉层'
  )
  assert.match(
    login,
    /const handleAgreementWechatPhoneLogin = async[\s\S]*?setAgreementWechatAuthorizing\(false\)[\s\S]*?setShowDialog\(false\)[\s\S]*?handleWechatPhoneLogin\(event, true\)/,
    '协议授权回调必须显式按已同意协议继续登录，不能依赖尚未刷新的 React 状态'
  )
  assert.doesNotMatch(
    login,
    /showDirectWechatAuth|wechat-direct-auth/,
    '协议同意后不得再插入需要二次点击的自定义微信授权面板'
  )
})

test('登录方式底部面板与选项框保持最新蓝湖尺寸', () => {
  const login = read('src/pages/login/index.tsx')

  assert.match(login, /minHeight:\s*'468rpx'/, '登录方式面板高度必须对齐蓝湖')
  assert.match(login, /background:\s*'#F8F9FB'/, '登录方式面板背景色必须对齐蓝湖')
  assert.match(login, /id="login-method-options"[\s\S]{0,80}marginTop:\s*'24rpx'/)
  assert.match(login, /height:\s*'98rpx'/, '登录选项框高度必须为 98rpx')
  assert.match(login, /index === 0 \? '0' : '20rpx'/, '两条登录选项间距必须为蓝湖 10px')
  assert.match(login, /marginTop:\s*'42rpx'/, '协议区与登录选项间距必须对齐蓝湖')
})

test('千寻与我的共用蓝湖未认证视图', () => {
  const componentPath = path.join(root, 'src/features/verification/VerificationEntryView.tsx')
  assert.ok(fs.existsSync(componentPath), '缺少共享蓝湖未认证视图')

  const verificationEntry = fs.readFileSync(componentPath, 'utf8')
  const index = read('src/pages/index/index.tsx')
  const profile = read('src/pages/profile/index.tsx')

  assert.match(index, /import VerificationEntryView/, '千寻未认证入口必须接入共享视图')
  assert.match(index, /role="index-unverified"/, '千寻未认证入口缺少稳定运行态节点')
  assert.match(profile, /import VerificationEntryView/, '我的未认证入口必须接入共享视图')
  assert.match(profile, /data\.accessStatus\?\.coreAccessStatus !== 'CORE_ALLOWED'/, '我的页必须按核心准入状态阻止正常个人中心提前渲染')
  assert.match(profile, /role="profile-unverified"/, '我的未认证入口缺少稳定运行态节点')
  assert.match(verificationEntry, /data-role=\{role\}/, '共享未认证视图必须暴露真实运行态节点')
  assert.match(verificationEntry, /id=\{role\}/, '共享未认证视图必须提供微信自动化可定位节点')
  assert.match(verificationEntry, /id=\{`\$\{role\}-continue`\}/, '未认证主按钮必须提供微信运行态几何验收节点')
  assert.match(
    verificationEntry,
    /role === 'index-unverified' \? <TopTabs unreadCount=\{unreadCount\} \/> : null/,
    '我的未认证态不得显示左上角成家/知音/立业栏目头'
  )
  assert.match(verificationEntry, /id="verification-entry-actions"[\s\S]{0,220}marginTop: '1098rpx'/, '未认证主操作区必须保持蓝湖纵向基线并避免绝对定位漂移')
  assert.match(verificationEntry, /id=\{`\$\{role\}-continue`\}[\s\S]{0,220}borderRadius: '27rpx'/, '未认证主按钮必须保持蓝湖 13.5px 圆角')
  assert.match(verificationEntry, /width: '700rpx'[\s\S]{0,100}height: '168rpx'/, '部分资料卡必须保持蓝湖 350×84px 几何')
})

test('我的页先判定核心准入再加载会员和千寻币资产', () => {
  const profileHook = read('src/hooks/useProfile.ts')

  assert.match(profileHook, /prd01Api\.getHomeDetail\(\)/, '我的页缺少主页准入数据')
  assert.match(profileHook, /prd01Api\.getBasicProfile\(\)/, '我的未认证初始态缺少基础资料数据')
  assert.match(profileHook, /prd01Api\.getIntroduction\(\)/, '我的未认证进度态缺少自我介绍数据')
  assert.match(profileHook, /setAccessStatus\(homeResult\.accessStatus\)/, '我的页必须把最新准入状态回写登录态')
  assert.match(profileHook, /homeResult\.accessStatus\.coreAccessStatus === 'CORE_ALLOWED'[\s\S]{0,500}getVipStatus\(\)[\s\S]{0,120}getCoinBalance\(\)/, '只有完成核心认证后才能加载正常个人中心资产')
})

test('我的未认证节点停留在真实我的 Tab 路由', () => {
  const profile = read('src/pages/profile/index.tsx')
  const customTabBar = read('src/custom-tab-bar/index.tsx')

  assert.match(customTabBar, /'pages\/profile\/index': 'profile'/, '我的真实路由必须点亮我的 Tab')
  const blockedBranch = profile.match(/if \(data\.accessStatus\?\.coreAccessStatus !== 'CORE_ALLOWED'\) \{[\s\S]*?\n  \}/)?.[0]
  assert.ok(blockedBranch, '我的页缺少未认证渲染分支')
  assert.doesNotMatch(blockedBranch, /redirectTo|reLaunch|switchTab/, '我的未认证态不得把用户重定向出我的 Tab')
})
