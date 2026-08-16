import type { MessageImGateway } from './MessageImGateway'

let liteChatGatewayPromise: Promise<MessageImGateway> | undefined
let mockGatewayPromise: Promise<MessageImGateway> | undefined

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
    liteChatGatewayPromise = import('./LiteChatMessageImGateway').then(
      ({ LiteChatMessageImGateway }) => new LiteChatMessageImGateway(),
    )
  }
  return liteChatGatewayPromise
}
