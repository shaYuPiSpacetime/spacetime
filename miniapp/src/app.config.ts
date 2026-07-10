export default {
  lazyCodeLoading: 'requiredComponents',
  pages: [
    'pages/login/index',
    'pages/profile/index',
    'pages/login/address',
    'pages/login/phone',
    'pages/login/gender',
    'pages/login/age',
    'pages/login/identity',
    'pages/login/education',
    'pages/profile/edit',
    'pages/community/index',
    'pages/chat/index',
    'pages/index/index',
    'pages/recommend/index',
    'pages/recommend/post',
    'pages/commerce/payment-result'
  ],
  subPackages: [
    {
      root: 'pages/verification',
      pages: [
        'my-certification',
        'triple',
        'basic',
        'height-weight',
        'hometown',
        'career',
        'income',
        'avatar',
        'avatar-album',
        'avatar-crop',
        'avatar-review',
        'intro',
        'intro-edit',
        'real-name',
        'education-student',
        'education-mainland',
        'education-chsi-help',
        'education-diploma-no',
        'education-certificate-upload'
      ]
    },
    {
      root: 'pages/featured',
      pages: [
        'index'
      ]
    },
    {
      root: 'pages/membership',
      pages: [
        'index',
        'records',
        'record-detail',
        'subscription'
      ]
    },
    {
      root: 'pages/coins',
      pages: [
        'index',
        'detail'
      ]
    },
    {
      root: 'pages/assessment',
      pages: [
        'index'
      ]
    },
    {
      root: 'pages/profile-edit',
      pages: [
        'intro',
        'tags',
        'about',
        'songs'
      ]
    }
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '成家立业',
    navigationBarTextStyle: 'black'
  },
  permission: {
    'scope.userLocation': {
      desc: '用于自动定位你的居住城市，帮助推荐更合适的人'
    }
  },
  requiredPrivateInfos: [
    'getLocation'
  ],
  tabBar: {
    custom: true,
    color: '#999999',
    selectedColor: '#2876FF',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '千寻',
        iconPath: 'assets/icons/tab-home.png',
        selectedIconPath: 'assets/icons/tab-home.png'
      },
      {
        pagePath: 'pages/community/index',
        text: '心动',
        iconPath: 'assets/icons/tab-work.png',
        selectedIconPath: 'assets/icons/tab-work.png'
      },
      {
        pagePath: 'pages/recommend/index',
        text: '推荐',
        iconPath: 'assets/icons/tab-recommend.png',
        selectedIconPath: 'assets/icons/tab-recommend.png'
      },
      {
        pagePath: 'pages/chat/index',
        text: '消息',
        iconPath: 'assets/icons/tab-message.png',
        selectedIconPath: 'assets/icons/tab-message.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/tab-profile-active.png',
        selectedIconPath: 'assets/icons/tab-profile-active.png'
      }
    ]
  }
}
