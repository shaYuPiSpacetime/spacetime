package com.spacetime.common.service;

/** 微信小程序码生成服务。 */
public interface WechatMiniappCodeService {

    /**
     * 生成可在微信中直接打开指定页面的永久小程序码。
     *
     * @param scene 页面启动参数，最多 32 个可见字符
     * @param page  小程序页面路径，不含查询参数
     * @return PNG 图片字节
     */
    byte[] generateUnlimitedCode(String scene, String page);
}
