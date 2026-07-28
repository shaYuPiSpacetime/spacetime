package com.spacetime.miniapp.service.impl;

import com.spacetime.common.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;

/**
 * Taro H5 邀请链接构造器。
 */
@Component
public class PromotionShareLinkBuilder {
    private final String h5BaseUrl;

    public PromotionShareLinkBuilder(
            @Value("${promotion.share.h5-base-url:}") String h5BaseUrl) {
        this.h5BaseUrl = h5BaseUrl;
    }

    /**
     * 生产域名必须使用 HTTPS；仅 localhost/127.0.0.1 允许 HTTP 联调。
     */
    public String build(String query) {
        if (h5BaseUrl == null || h5BaseUrl.isBlank()) {
            return null;
        }
        try {
            URI baseUri = URI.create(h5BaseUrl.trim());
            String host = baseUri.getHost();
            boolean localHttp = "http".equalsIgnoreCase(baseUri.getScheme())
                    && ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host));
            boolean https = "https".equalsIgnoreCase(baseUri.getScheme());
            if (host == null || (!https && !localHttp)
                    || baseUri.getQuery() != null || baseUri.getFragment() != null) {
                throw new BusinessException("推广 H5 部署基址必须为 HTTPS，且不能包含查询参数或片段");
            }
            String base = h5BaseUrl.trim();
            while (base.endsWith("/")) {
                base = base.substring(0, base.length() - 1);
            }
            return base + "/#/pages/promotion/invite-home?" + query;
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("推广 H5 部署基址配置无效");
        }
    }
}
