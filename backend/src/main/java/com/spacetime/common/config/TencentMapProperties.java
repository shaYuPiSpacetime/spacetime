package com.spacetime.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** 腾讯地图 WebService 逆地址解析配置。 */
@Data
@Component
@ConfigurationProperties(prefix = "tencent.map")
public class TencentMapProperties {
    /** 服务端 WebService 密钥，仅由环境变量注入。 */
    private String key;
    /** 建连超时毫秒数。 */
    private int connectTimeoutMillis = 3000;
    /** 单次查询超时毫秒数。 */
    private int requestTimeoutMillis = 5000;
}
