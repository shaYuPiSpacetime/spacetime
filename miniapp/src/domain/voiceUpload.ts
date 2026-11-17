/** 按录音文件头确定上传名称；电脑端临时路径可能没有音频扩展名。 */
export function resolveVoiceUploadFileName(header: ArrayBuffer): string {
  const bytes = new Uint8Array(header)
  const matches = (offset: number, text: string) =>
    Array.from(text).every((char, index) => bytes[offset + index] === char.charCodeAt(0))

  if (bytes.length >= 10 && matches(0, 'ID3')) return 'voice-intro.mp3'

  if (bytes.length >= 4 && bytes[0] === 0xff) {
    // MPEG Layer III 帧头与 AAC 的 ADTS 帧头不能混用。
    const isMp3 = (bytes[1] & 0xe0) === 0xe0
      && (bytes[1] & 0x18) !== 0x08
      && (bytes[1] & 0x06) === 0x02
      && (bytes[2] & 0xf0) !== 0x00
      && (bytes[2] & 0xf0) !== 0xf0
      && (bytes[2] & 0x0c) !== 0x0c
    if (isMp3) return 'voice-intro.mp3'
    if (bytes.length >= 7 && (bytes[1] & 0xf6) === 0xf0) return 'voice-intro.aac'
  }

  if (bytes.length >= 12 && matches(0, 'RIFF') && matches(8, 'WAVE')) return 'voice-intro.wav'
  if (bytes.length >= 12 && matches(4, 'ftyp') && matches(8, 'M4A ')) return 'voice-intro.m4a'

  throw new Error('无法识别录音格式，请重新录制或使用手机微信录制')
}
