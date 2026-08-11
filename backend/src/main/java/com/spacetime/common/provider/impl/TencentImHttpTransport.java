package com.spacetime.common.provider.impl;

import java.net.URI;

/** 可替换的 TIM HTTP 传输层，便于故障注入与离线单元测试。 */
public interface TencentImHttpTransport {
    TencentImHttpResponse post(URI uri, String requestBody);
}
