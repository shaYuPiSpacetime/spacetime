import path from 'node:path'
import { defineConfig } from '@tarojs/cli'
import { UnifiedWebpackPluginV5 } from 'weapp-tailwindcss/webpack'

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
  compiler: 'webpack5',

  mini: {
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
