import path from 'node:path'
import { defineConfig } from '@tarojs/cli'
import { UnifiedWebpackPluginV5 } from 'weapp-tailwindcss/webpack'

function miniAssetName(moduleId: string) {
  const normalized = moduleId.replace(/\\/g, '/')
  const relativePath = normalized.includes('/src/')
    ? normalized.slice(normalized.lastIndexOf('/src/') + '/src/'.length)
    : normalized.replace(/^.*?src\//, '')

  if (relativePath.startsWith('assets/login/')) {
    return `pages/login/${relativePath}`
  }
  if (relativePath.startsWith('assets/lanhu/verification/')) {
    return `pages/verification/${relativePath}`
  }
  if (relativePath === 'assets/lanhu/pages/featured-person.webp') {
    return `pages/featured/${relativePath}`
  }
  if (relativePath === 'assets/lanhu/pages/member-vip-bg.webp') {
    return `pages/membership/${relativePath}`
  }
  if (relativePath === 'assets/lanhu/pages/coin-balance-bg.webp') {
    return `pages/coins/${relativePath}`
  }

  return relativePath
}

const config = {
  projectName: 'chengjialiye',
  date: '2026-05-27',
  designWidth: 375,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  enableSourceMap: false,

  defineConstants: {
    'process.env.API_BASE_URL': JSON.stringify(
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:8080'
        : 'https://api.chengjialiye.com'
    )
  },

  alias: {
    '@': path.resolve(__dirname, '..', 'src')
  },

  copy: {
    patterns: [],
    options: {}
  },

  framework: 'react',
  compiler: {
    type: 'webpack5' as const,
    prebundle: {
      enable: false
    }
  },

  mini: {
    enableSourceMap: false,
    output: {
      clean: true
    },
    imageUrlLoaderOption: {
      name: miniAssetName
    },
    mediaUrlLoaderOption: {
      name: miniAssetName
    },
    optimizeMainPackage: {
      enable: true
    },
    webpackChain(chain) {
      // weapp-tailwindcss 插件
      chain.plugin('weapp-tailwindcss').use(UnifiedWebpackPluginV5, [{ appType: 'taro' }])
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  },

  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    router: {
      mode: 'hash'
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {
          // H5 自测用: html font-size 在 375px 宽时 = 50px（由 deviceRatio 计算）
          // 所以 baseFontSize 也设为 50，保证 px→rem 转换与根字号对齐
          // 用法: 打开 http://localhost:10087，Chrome DevTools 切到 375×812
          baseFontSize: 50,
        }
      },
      autoprefixer: { enable: true, config: {} },
      cssModules: {
        enable: true,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  }
}

export default defineConfig(config)
