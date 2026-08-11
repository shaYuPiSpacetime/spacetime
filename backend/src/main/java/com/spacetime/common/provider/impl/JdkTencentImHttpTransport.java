package com.spacetime.common.provider.impl;

import com.spacetime.common.config.TencentImProperties;
import com.spacetime.common.provider.InstantMessageException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/** 基于 JDK 21 HttpClient 的腾讯云 TIM REST 传输实现。 */
@Component
@ConditionalOnProperty(prefix = "message.tencent-im", name = "enabled", havingValue = "true")
public class JdkTencentImHttpTransport implements TencentImHttpTransport {
    private final TencentImProperties properties;
    private final HttpClient httpClient;

    public JdkTencentImHttpTransport(TencentImProperties properties) {
        this.properties = properties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(properties.getConnectTimeoutMillis()))
                .build();
    }

    @Override
    public TencentImHttpResponse post(URI uri, String requestBody) {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofMillis(properties.getRequestTimeoutMillis()))
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());
            return new TencentImHttpResponse(response.statusCode(), response.body());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new InstantMessageException("TIM_HTTP_INTERRUPTED", "腾讯云TIM请求被中断", true);
        } catch (IOException ex) {
            throw new InstantMessageException("TIM_HTTP_IO", "腾讯云TIM网络请求失败", true);
        }
    }
}
