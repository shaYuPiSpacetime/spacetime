package com.spacetime.common.provider;

/**
 * 图片内容安全审核 Provider。
 *
 * <p>覆盖头像、相册照片和资料背景图。后续接入真实图片审核三方时，只替换实现类，
 * 业务提交、审核记录和审核历史链路保持不变。</p>
 */
public interface ImageSafetyProvider {

    /**
     * 审核一张图片。
     *
     * @param auditType 审核类型：AVATAR、ALBUM_PHOTO、PROFILE_BG
     * @param mediaUrl 原图地址
     * @param thumbUrl 缩略图地址，可为空
     * @return Provider 审核结果
     */
    ProviderCheckResult check(String auditType, String mediaUrl, String thumbUrl);
}
