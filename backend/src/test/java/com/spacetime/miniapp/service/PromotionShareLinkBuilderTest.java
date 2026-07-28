package com.spacetime.miniapp.service;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.service.impl.PromotionShareLinkBuilder;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Taro H5 邀请链接生成测试。
 */
class PromotionShareLinkBuilderTest {

    @Test
    void 生产部署基址生成可路由的Hash页面链接() {
        PromotionShareLinkBuilder builder =
                new PromotionShareLinkBuilder("https://h5.shikongxiehou.com/app/");

        assertThat(builder.build("sourceType=normal_user&sourceToken=TRC-1"))
                .isEqualTo("https://h5.shikongxiehou.com/app/#/pages/promotion/invite-home"
                        + "?sourceType=normal_user&sourceToken=TRC-1");
    }

    @Test
    void 本地联调允许localhost和127地址使用Http() {
        assertThat(new PromotionShareLinkBuilder("http://localhost:10086")
                .build("sourceToken=T1"))
                .startsWith("http://localhost:10086/#/pages/promotion/invite-home?");
        assertThat(new PromotionShareLinkBuilder("http://127.0.0.1:10086/")
                .build("sourceToken=T1"))
                .startsWith("http://127.0.0.1:10086/#/pages/promotion/invite-home?");
    }

    @Test
    void 非本机Http和带片段的基址被拒绝() {
        assertThatThrownBy(() -> new PromotionShareLinkBuilder("http://h5.example.com")
                .build("sourceToken=T1"))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> new PromotionShareLinkBuilder("https://h5.example.com/#/old")
                .build("sourceToken=T1"))
                .isInstanceOf(BusinessException.class);
    }
}
