package com.spacetime.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "gugudata.college")
public class GuGuDataCollegeProperties {
    private String baseUrl = "https://api.gugudata.com/location/college";
    private String appKey;
    private int connectTimeoutMillis = 3000;
    private int requestTimeoutMillis = 5000;
}
