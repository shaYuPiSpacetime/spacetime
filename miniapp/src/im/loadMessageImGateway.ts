import type { MessageImGateway } from './MessageImGateway'
import { getMessageAuthSessionVersion, onMessageAuthSessionChanged } from '../domain/messageLifecycle'

let liteChatGatewayPromise: Promise<MessageImGateway> | undefined
let mockGatewayPromise: Promise<MessageImGateway> | undefined
let disposalPromise: Promise<void> = Promise.resolve()

onMessageAuthSessionChanged(() => {
  const previous = liteChatGatewayPromise
  liteChatGatewayPromise = undefined
  if (!previous) return
  // 必须等旧实例销毁后创建新实例，Tencent create 可能按 SDKAppID 返回缓存实例。
  disposalPromise = Promise.all([
    disposalPromise,
    previous.then(gateway => gateway.logout(), () => undefined),
  ]).then(() => undefined)
  void disposalPromise.catch(() => undefined)
})

function loadMockGateway(): Promise<MessageImGateway> {
  if (!mockGatewayPromise) {
    mockGatewayPromise = import('./MockMessageImGateway').then(
      ({ MockMessageImGateway }) => new MockMessageImGateway(),
    )
  }
  return mockGatewayPromise
}

/** 页面挂载后才异步加载 TIM，保证导航和返回按钮不被 SDK 下载、解析阻塞。 */
export function loadMessageImGateway(useMockScene = false): Promise<MessageImGateway> {
  const forceMock =
    typeof process !== 'undefined' && process.env.MINIAPP_MESSAGE_PROVIDER === 'mock'
  if (useMockScene || forceMock) return loadMockGateway()

  if (!liteChatGatewayPromise) {
    const version = getMessageAuthSessionVersion()
    const previousDisposal = disposalPromise
    const loading = import('./LiteChatMessageImGateway').then(async ({ LiteChatMessageImGateway }) => {
      await previousDisposal
      if (version !== getMessageAuthSessionVersion()) throw new Error('登录身份已变化，请重新进入私信')
      return new LiteChatMessageImGateway(undefined, () => version === getMessageAuthSessionVersion())
    })
    liteChatGatewayPromise = loading
    void loading.catch(() => {
      if (liteChatGatewayPromise === loading) liteChatGatewayPromise = undefined
    })
  }
  return liteChatGatewayPromise
}
