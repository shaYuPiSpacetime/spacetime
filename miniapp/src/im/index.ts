import { MockMessageImGateway } from './MockMessageImGateway'

export type { MessageImGateway, SendMessageOptions } from './MessageImGateway'
export { MockMessageImGateway } from './MockMessageImGateway'

/** 当前默认 Mock；未来在此处按编译配置注入 LiteChat 网关。 */
export const messageImGateway = new MockMessageImGateway()
