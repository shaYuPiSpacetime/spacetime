module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true
    }]
  ],
  plugins: [
    ['import', {
      libraryName: '@antmjs/vantui',
      libraryDirectory: 'es',
      style: true
    }, '@antmjs/vantui']
  ]
}
