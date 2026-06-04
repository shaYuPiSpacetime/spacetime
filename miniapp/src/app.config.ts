export default {
  pages: [
    'pages/profile/index',
    'pages/index/index',
    'pages/community/index',
    'pages/assessment/index',
    'pages/chat/index',
    'pages/login/index',
    'pages/profile/edit',
    'pages/featured/index',
    'pages/membership/index',
    'pages/membership/records',
    'pages/coins/index',
    'pages/coins/detail',
    'pages/login/gender',
    'pages/login/education',
    'pages/login/address',
    'pages/login/age'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '成家立业',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    custom: true,
    color: '#999999',
    selectedColor: '#2876FF',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '成家',
        iconPath: 'assets/icons/tab-home.png',
        selectedIconPath: 'assets/icons/tab-home-active.png'
      },
      {
        pagePath: 'pages/community/index',
        text: '立业',
        iconPath: 'assets/icons/tab-community.png',
        selectedIconPath: 'assets/icons/tab-community-active.png'
      },
      {
        pagePath: 'pages/assessment/index',
        text: '推荐',
        iconPath: 'assets/icons/tab-assessment.png',
        selectedIconPath: 'assets/icons/tab-assessment-active.png'
      },
      {
        pagePath: 'pages/chat/index',
        text: '消息',
        iconPath: 'assets/icons/tab-chat.png',
        selectedIconPath: 'assets/icons/tab-chat-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/tab-profile.png',
        selectedIconPath: 'assets/icons/tab-profile-active.png'
      }
    ]
  }
}
