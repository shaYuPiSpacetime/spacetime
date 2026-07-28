package com.spacetime.miniapp.service;

import com.spacetime.miniapp.service.impl.PromotionHtmlSanitizer;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 邀请规则 H5 XSS 白名单测试。
 */
class PromotionHtmlSanitizerTest {
    private final PromotionHtmlSanitizer sanitizer = new PromotionHtmlSanitizer();

    @Test
    void 清除危险标签事件属性与javascript协议并保留基础排版() {
        String html = """
                <h2 onclick=alert(1)>规则</h2>
                <script>alert(1)</script>
                <iframe src="https://evil.example"></iframe>
                <object data="x"></object><embed src="x">
                <form><button>提交</button><input autofocus onfocus=alert(1)></form>
                <a href="javascript:alert(1)" onmouseover='alert(2)'>危险链接</a>
                <img src="javascript:alert(3)" onerror=alert(4)>
                <p><strong>安全正文</strong></p>
                """;

        String cleaned = sanitizer.sanitize(html);

        assertThat(cleaned)
                .contains("<h2>规则</h2>")
                .contains("<p><strong>安全正文</strong></p>")
                .doesNotContainIgnoringCase("script")
                .doesNotContainIgnoringCase("iframe")
                .doesNotContainIgnoringCase("object")
                .doesNotContainIgnoringCase("embed")
                .doesNotContainIgnoringCase("<form")
                .doesNotContainIgnoringCase("<button")
                .doesNotContainIgnoringCase("<input")
                .doesNotContainIgnoringCase("onclick")
                .doesNotContainIgnoringCase("onmouseover")
                .doesNotContainIgnoringCase("onerror")
                .doesNotContainIgnoringCase("javascript:");
    }
}
