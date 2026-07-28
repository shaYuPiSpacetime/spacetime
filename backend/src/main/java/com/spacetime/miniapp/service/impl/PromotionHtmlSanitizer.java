package com.spacetime.miniapp.service.impl;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

/**
 * 邀请规则 H5 富文本白名单清洗器。
 */
@Component
public class PromotionHtmlSanitizer {
    private static final Safelist SAFELIST = Safelist.relaxed()
            .removeTags("iframe", "object", "embed", "form", "button",
                    "input", "textarea", "select", "option")
            .addProtocols("a", "href", "http", "https", "mailto")
            .addProtocols("img", "src", "http", "https");

    /**
     * 保留基础排版标签，移除事件属性、可执行标签和危险 URL 协议。
     */
    public String sanitize(String html) {
        if (html == null) {
            return null;
        }
        Document.OutputSettings outputSettings = new Document.OutputSettings().prettyPrint(false);
        return Jsoup.clean(html, "", SAFELIST, outputSettings);
    }
}
