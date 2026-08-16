type LiteChatPluginCore = {
  common: {
    buildAndSendPacket(options: {
      servcmd: string
      data: LiteChatC2CReadPayload
    }): Promise<unknown>
  }
}

export type LiteChatC2CReadPayload = {
  C2CMsgReaded: {
    Cookie: string
    C2CMsgReadedItem: Array<{
      To_Account: string
      LastedMsgTime: number
      Receipt: number
    }>
  }
}

/** LiteChat Basic 未内置会话插件，只补齐私信所需的单聊已读命令，避免引入完整会话模块。 */
export function buildLiteChatC2CReadPayload(
  conversationId: string,
  lastReadTime: number,
): LiteChatC2CReadPayload {
  if (!conversationId.startsWith('C2C') || conversationId.length <= 3) {
    throw new Error('TIM 单聊会话号无效')
  }
  if (!Number.isInteger(lastReadTime) || lastReadTime <= 0) {
    throw new Error('TIM 最新消息时间无效')
  }
  return {
    C2CMsgReaded: {
      Cookie: '',
      C2CMsgReadedItem: [{
        To_Account: conversationId.slice(3),
        LastedMsgTime: lastReadTime,
        Receipt: 1,
      }],
    },
  }
}

export class LiteChatC2CReadPlugin {
  readonly name = 'SpacetimeC2CRead'
  private core?: LiteChatPluginCore

  install(core: LiteChatPluginCore) {
    this.core = core
  }

  async markRead(conversationId: string, lastReadTime: number): Promise<void> {
    if (!this.core) throw new Error('TIM 单聊已读能力尚未初始化')
    await this.core.common.buildAndSendPacket({
      servcmd: 'openim.msgreaded',
      data: buildLiteChatC2CReadPayload(conversationId, lastReadTime),
    })
  }
}

export function createLiteChatC2CReadPlugin(): LiteChatC2CReadPlugin {
  return new LiteChatC2CReadPlugin()
}
