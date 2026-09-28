package com.spacetime.website;

import com.spacetime.common.community.CommunitySecurityResult;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class WebsitePolicyTest {
    @Test
    void 发布活动必须包含未来时间地点图片和非负预计费用() {
        LocalDateTime future = LocalDateTime.now().plusDays(2);
        assertDoesNotThrow(() -> WebsitePolicy.validateActivity("校园骑行", "周末集合骑行", future,
                "大学城南门", new BigDecimal("12.50"), List.of(1L)));
        assertThrows(BusinessException.class, () -> WebsitePolicy.validateActivity("校园骑行", "周末集合骑行",
                LocalDateTime.now().minusMinutes(1), "大学城南门", BigDecimal.ZERO, List.of(1L)));
        assertThrows(BusinessException.class, () -> WebsitePolicy.validateActivity("校园骑行", "周末集合骑行",
                future, "", BigDecimal.ZERO, List.of(1L)));
        assertThrows(BusinessException.class, () -> WebsitePolicy.validateActivity("校园骑行", "周末集合骑行",
                future, "大学城南门", BigDecimal.ZERO, List.of()));
        assertThrows(BusinessException.class, () -> WebsitePolicy.validateActivity("校园骑行", "周末集合骑行",
                future, "大学城南门", new BigDecimal("-1"), List.of(1L)));
    }

    @Test
    void 敏感词和词库不可用均不能发布() {
        assertDoesNotThrow(() -> WebsitePolicy.requireSafeText(CommunitySecurityResult.pass("clear")));
        assertThrows(BusinessException.class,
                () -> WebsitePolicy.requireSafeText(CommunitySecurityResult.reject("word", "hit")));
        assertThrows(BusinessException.class,
                () -> WebsitePolicy.requireSafeText(CommunitySecurityResult.unavailable("offline")));
    }

    @Test
    void 私聊仅允许活动发布者与参与者之间() {
        assertTrue(WebsitePolicy.canChat(1L, 2L, 1L, false, true));
        assertTrue(WebsitePolicy.canChat(2L, 3L, 1L, true, true));
        assertFalse(WebsitePolicy.canChat(2L, 3L, 1L, true, false));
        assertFalse(WebsitePolicy.canChat(1L, 2L, 1L, false, false));
        assertFalse(WebsitePolicy.canChat(1L, 1L, 1L, false, false));
    }
}
