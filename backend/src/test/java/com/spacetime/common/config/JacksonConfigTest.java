package com.spacetime.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class JacksonConfigTest {

    @Test
    void configuredJavaTimeValuesShouldRoundTrip() throws Exception {
        Jackson2ObjectMapperBuilder builder = new Jackson2ObjectMapperBuilder();
        new JacksonConfig().jackson2ObjectMapperBuilderCustomizer().customize(builder);
        ObjectMapper objectMapper = builder.build();
        TimePayload source = new TimePayload(
                LocalDateTime.of(2026, 8, 13, 18, 36, 28),
                LocalDate.of(2026, 8, 13),
                LocalTime.of(18, 36, 28));

        String json = objectMapper.writeValueAsString(source);
        TimePayload restored = objectMapper.readValue(json, TimePayload.class);

        assertThat(json).contains("2026-08-13 18:36:28", "2026-08-13", "18:36:28");
        assertThat(restored).isEqualTo(source);
    }

    private record TimePayload(LocalDateTime dateTime, LocalDate date, LocalTime time) {
    }
}
