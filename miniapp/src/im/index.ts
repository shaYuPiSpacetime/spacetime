import { LiteChatMessageImGateway } from './LiteChatMessageImGateway'
import { MockMessageImGateway } from './MockMessageImGateway'

const useMockGateway =
  typeof process !== 'undefined' && process.env.MINIAPP_MESSAGE_PROVIDER === 'mock'

export const messageImGateway = useMockGateway
  ? new MockMessageImGateway()
  : new LiteChatMessageImGateway()

export const mockMessageImGateway = new MockMessageImGateway()

export type {
  MessageHistoryPage,
  MessageImEvent,
  MessageImGateway,
  SendTextOptions,
} from './MessageImGateway'
export { LiteChatMessageImGateway } from './LiteChatMessageImGateway'
export { MockMessageImGateway } from './MockMessageImGateway'
