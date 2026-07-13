package com.spacetime.miniapp.dto.request;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("首登分步提交入参契约")
class ProfileInitStepReqContractTest {

    @Test
    @DisplayName("只保留五步首次资料字段")
    void shouldOnlyExposeFirstLoginFields() {
        Set<String> fields = Arrays.stream(ProfileInitStepReq.class.getDeclaredFields())
                .map(Field::getName)
                .collect(Collectors.toSet());

        assertThat(fields).containsExactlyInAnyOrder(
                "step",
                "gender",
                "birthday",
                "identity",
                "educationLevel",
                "locationProvince",
                "locationCity",
                "locationDistrict");
    }
}
