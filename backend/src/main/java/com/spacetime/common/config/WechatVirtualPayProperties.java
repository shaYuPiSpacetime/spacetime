package com.spacetime.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 微信小程序虚拟支付配置。
 */
@Data
@Component
@ConfigurationProperties(prefix = "wechat-virtual-pay")
public class WechatVirtualPayProperties {
    /** 是否启用虚拟支付；未完成平台开通前保持关闭。 */
    private boolean enabled;
    /** 虚拟支付基础配置中的 OfferId。 */
    private String offerId;
    /** 与 env 对应的虚拟支付 AppKey。 */
    private String appKey;
    /** 0：正式环境；1：沙箱环境。 */
    private int env;
    /** 待支付订单补偿查单间隔。 */
    private long reconcileDelayMs = 30000L;
}
