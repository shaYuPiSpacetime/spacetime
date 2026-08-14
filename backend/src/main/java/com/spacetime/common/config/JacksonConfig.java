package com.spacetime.common.config;

import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalTimeSerializer;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

/**
 * Jackson 序列化配置，统一时间字段输出为字符串格式
 */
@Configuration
public class JacksonConfig {

    /** 日期时间格式 */
    private static final String DATE_TIME_PATTERN = "yyyy-MM-dd HH:mm:ss";
    /** 日期格式 */
    private static final String DATE_PATTERN = "yyyy-MM-dd";
    /** 时间格式 */
    private static final String TIME_PATTERN = "HH:mm:ss";

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jackson2ObjectMapperBuilderCustomizer() {
        return builder -> {
            JavaTimeModule module = new JavaTimeModule();
            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern(DATE_TIME_PATTERN);
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern(DATE_PATTERN);
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern(TIME_PATTERN);
            module.addSerializer(new LocalDateTimeSerializer(dateTimeFormatter));
            module.addDeserializer(LocalDateTime.class, new LocalDateTimeDeserializer(dateTimeFormatter));
            module.addSerializer(new LocalDateSerializer(dateFormatter));
            module.addDeserializer(LocalDate.class, new LocalDateDeserializer(dateFormatter));
            module.addSerializer(new LocalTimeSerializer(timeFormatter));
            module.addDeserializer(LocalTime.class, new LocalTimeDeserializer(timeFormatter));
            builder.modules(module);
        };
    }
}
