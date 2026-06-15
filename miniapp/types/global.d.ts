/// <reference types="@tarojs/taro" />

declare module '*.png'
declare module '*.gif'
declare module '*.jpg'
declare module '*.jpeg'
declare module '*.webp'
declare module '*.svg'
declare module '*.scss'
declare module '*.sass'
declare module '*.css'

declare namespace NodeJS {
  interface ProcessEnv {
    API_BASE_URL: string
    NODE_ENV: 'development' | 'production'
  }
}
