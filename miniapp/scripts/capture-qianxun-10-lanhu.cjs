/* eslint-env node */

/**
 * 旧“10 稿”脚本曾通过生产路由 variant 强制 mock，并把同城全、热门截成同一张图。
 * 该方式已禁用；当前只允许调用真实场景截图脚本。
 */
require('./capture-qianxun-current-ui.cjs')
