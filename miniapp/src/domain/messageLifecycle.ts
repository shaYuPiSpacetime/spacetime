/** 主包与消息分包之间的轻量生命周期事件，不依赖 LiteChat SDK。 */
export const MESSAGE_RUNTIME_BACKGROUND_EVENT = 'message-runtime:background'

let authSessionVersion = 0
const authSessionListeners = new Set<() => void>()

/** 认证代次只保存在内存中；同账号重新登录也不能复用旧 UserSig/发送队列。 */
export function getMessageAuthSessionVersion(): number {
  return authSessionVersion
}

/** 登录身份变更时先同步撤销旧网关的可用性，SDK 清理可异步完成。 */
export function invalidateMessageAuthSession(): void {
  authSessionVersion += 1
  authSessionListeners.forEach(listener => listener())
}

export function onMessageAuthSessionChanged(listener: () => void): () => void {
  authSessionListeners.add(listener)
  return () => { authSessionListeners.delete(listener) }
}
