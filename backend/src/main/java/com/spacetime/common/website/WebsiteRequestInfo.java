package com.spacetime.common.website;

import jakarta.servlet.http.HttpServletRequest;

/** 从网关覆盖写入的 X-Real-IP 读取访客地址，直连时退回连接地址。 */
public final class WebsiteRequestInfo {
    private WebsiteRequestInfo() {}

    public static String clientIp(HttpServletRequest request) {
        if (request == null) return null;
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && realIp.length() <= 45 && realIp.matches("[0-9a-fA-F:.]+")) return realIp;
        return request.getRemoteAddr();
    }
}
