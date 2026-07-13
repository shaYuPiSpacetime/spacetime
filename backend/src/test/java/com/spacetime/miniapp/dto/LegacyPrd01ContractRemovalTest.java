package com.spacetime.miniapp.dto;

import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 用户准入模块旧接口字段清理契约测试。
 */
@DisplayName("用户准入旧接口字段清理")
class LegacyPrd01ContractRemovalTest {

    @Test
    @DisplayName("微信登录不再接收旧字段和未使用的加密字段")
    void shouldNotExposeLegacyWechatLoginFields() {
        assertNoField(WechatLoginReq.class, "code");
        assertNoField(WechatLoginReq.class, "encryptedData");
        assertNoField(WechatLoginReq.class, "iv");
    }

    @Test
    @DisplayName("准入状态只返回阻断原因列表")
    void shouldNotExposeLegacySingleBlockReason() {
        assertNoField(AccessStatusVO.class, "blockReason");
    }

    private void assertNoField(Class<?> type, String fieldName) {
        assertThatThrownBy(() -> type.getDeclaredField(fieldName))
                .isInstanceOf(NoSuchFieldException.class);
    }
}
