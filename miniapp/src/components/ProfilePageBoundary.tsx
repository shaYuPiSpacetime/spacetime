import { Component, type ReactNode } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

/** 本人资料页的渲染异常不能卸载整页，保留重新加载和返回入口。 */
export default class ProfilePageBoundary extends Component<{ children: ReactNode }, { failed: boolean; revision: number }> {
  state = { failed: false, revision: 0 }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.error('[profile-page-render]', error)
  }

  render() {
    if (!this.state.failed) return <View key={this.state.revision}>{this.props.children}</View>
    return (
      <View data-role="profile-render-error" style={{ minHeight: '100vh', background: '#F2F6FC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28rpx' }}>
        <Text style={{ color: '#0C285A', fontSize: '32rpx' }}>主页暂时无法显示</Text>
        <Text style={{ color: '#68778E', fontSize: '26rpx' }}>请重新加载后再试</Text>
        <Button onClick={() => this.setState(state => ({ failed: false, revision: state.revision + 1 }))}>重新加载</Button>
        <Button onClick={() => void Taro.switchTab({ url: '/pages/profile/index' })}>返回我的</Button>
      </View>
    )
  }
}
