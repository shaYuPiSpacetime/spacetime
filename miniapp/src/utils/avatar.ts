import Taro from '@tarojs/taro'

export async function chooseAndCropAvatar() {
  const res = await Taro.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
  })
  const sourcePath = res.tempFilePaths[0]
  if (!sourcePath) return ''

  try {
    const cropRes = await Taro.cropImage({ src: sourcePath, cropScale: '1:1' })
    return cropRes.tempFilePath || sourcePath
  } catch {
    return sourcePath
  }
}
