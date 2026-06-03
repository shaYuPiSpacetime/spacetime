/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  // 小程序不支持 dark mode 媒体查询
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 成家立业品牌色系
        primary: '#E54D42',
        'primary-light': '#FF8A80',
        // 功能蓝色（精选/按钮/高亮）
        'brand-blue': '#2876FF',
        'brand-blue-light': '#7B9DFB',
        'brand-blue-bg': '#E3F1FE',
        // 深蓝文字（标题/重点）
        'text-dark': '#153060',
        // 金色（VIP/会员）
        'vip-gold': '#FFC969',
      },
      fontSize: {
        // designWidth=375, pxtransform: 1px CSS = 2rpx WXSS
        // 蓝湖 750px 坐标系 → ÷2 → 实际 CSS px
        // 蓝湖 20px → 10px CSS
        // 蓝湖 22px → 11px CSS
        // 蓝湖 24px → 12px CSS
        // 蓝湖 26px → 13px CSS
        // 蓝湖 28px → 14px CSS
        // 蓝湖 32px → 16px CSS
        // 蓝湖 36px → 18px CSS
        // 蓝湖 38px → 19px CSS
        // 蓝湖 48px → 24px CSS
        xs:   '10px',
        sm:   '12px',
        base: '14px',
        lg:   '16px',
        xl:   '18px',
        '2xl': '24px',
        // 蓝湖补充
        '11': '11px',
        '13': '13px',
        '19': '19px',
      },
      spacing: {
        // w/h-18 = 36px CSS → 72rpx → 36pt（常见图标/按钮尺寸）
        18: '36px',
      },
      borderRadius: {
        card: '12px',
        btn: '24px',
        'full-btn': '49px',
      },
    },
  },
  // weapp-tailwindcss 要求：关闭 preflight（小程序不支持）
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
