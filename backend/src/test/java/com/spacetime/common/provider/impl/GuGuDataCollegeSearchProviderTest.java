package com.spacetime.common.provider.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.GuGuDataCollegeProperties;
import com.spacetime.common.entity.SchoolDictionary;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GuGuData 高校搜索适配器")
class GuGuDataCollegeSearchProviderTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) server.stop(0);
    }

    @Test
    @DisplayName("使用请求头传AppKey并映射高校字段")
    void shouldSendAppKeyHeaderAndMapResponse() throws Exception {
        AtomicReference<String> appKey = new AtomicReference<>();
        AtomicReference<String> query = new AtomicReference<>();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/location/college", exchange -> {
            appKey.set(exchange.getRequestHeaders().getFirst("X-GUGUDATA-APPKEY"));
            query.set(exchange.getRequestURI().getRawQuery());
            byte[] body = ("{\"DataStatus\":{\"StatusCode\":100,\"StatusDescription\":\"OK\"},"
                    + "\"Data\":[{\"SchoolUUID\":\"u-zju\",\"CollegeCode\":\"10335\",\"CollegeName\":\"浙江大学\",\"ShortName\":\"浙大\","
                    + "\"Province\":\"浙江省\",\"City\":\"杭州市\",\"Is985\":true,\"Is211\":true,"
                    + "\"IsDualClass\":true,\"CollegeType\":\"本科\",\"CollegeCategory\":\"综合类\",\"EduLevel\":\"本科\",\"CollegeProperty\":\"公办\"}]}")
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json;charset=UTF-8");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        GuGuDataCollegeProperties properties = new GuGuDataCollegeProperties();
        properties.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/location/college");
        properties.setAppKey("test-key");
        GuGuDataCollegeSearchProvider provider = new GuGuDataCollegeSearchProvider(properties, new ObjectMapper());

        List<SchoolDictionary> result = provider.search("浙大", 10);

        assertThat(appKey.get()).isEqualTo("test-key");
        assertThat(query.get()).contains("keywords=%E6%B5%99%E5%A4%A7", "pagesize=10", "pageindex=1", "keywordstrict=false");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getProviderUuid()).isEqualTo("u-zju");
        assertThat(result.get(0).getSchoolCode()).isEqualTo("10335");
        assertThat(result.get(0).getSchoolName()).isEqualTo("浙江大学");
        assertThat(result.get(0).getShortName()).isEqualTo("浙大");
        assertThat(result.get(0).getIs985()).isTrue();
        assertThat(result.get(0).getSource()).isEqualTo("GUGUDATA");
    }
}
