/** 仅用户上传的社区小头像使用尺寸请求，原图、签名链接和静态图标不改写。 */
export function communityAvatarUrl(url: string): string {
  if (!/^https:\/\/shikongxiehou\.oss-cn-shanghai\.aliyuncs\.com\/miniapp\/\d+\/(?:album|avatar)\/[^?#]+\.(?:png|jpe?g|webp)$/i.test(url)) return url
  return `${url}?x-oss-process=image/resize,m_fill,w_160,h_160/format,webp`
}
