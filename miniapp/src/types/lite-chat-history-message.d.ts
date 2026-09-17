declare module '@tencentcloud/lite-chat/plugins/history-message' {
  const historyMessagePlugin: { name: string; install: (core: unknown) => void }
  export default historyMessagePlugin
}
