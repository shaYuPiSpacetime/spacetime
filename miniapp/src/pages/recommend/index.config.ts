export default {
  navigationStyle: 'custom',
  enableShareAppMessage: true,
  enablePullDownRefresh: process.env.TARO_ENV === 'h5',
  backgroundColor: '#EDF6FB',
  initialRenderingCache: 'static',
  backgroundTextStyle: 'dark',
}
