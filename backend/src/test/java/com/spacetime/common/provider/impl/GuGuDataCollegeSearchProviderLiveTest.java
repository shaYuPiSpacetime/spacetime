package com.spacetime.common.provider.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.GuGuDataCollegeProperties;
import com.spacetime.common.entity.SchoolDictionary;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GuGuData 高校搜索真实烟测")
class GuGuDataCollegeSearchProviderLiveTest {

    @Test
    @EnabledIfEnvironmentVariable(named = "GUGUDATA_COLLEGE_APP_KEY", matches = ".+")
    @DisplayName("真实查询浙大返回浙江大学及稳定编码")
    void shouldSearchRealCollegeData() {
        GuGuDataCollegeProperties properties = new GuGuDataCollegeProperties();
        properties.setAppKey(System.getenv("GUGUDATA_COLLEGE_APP_KEY"));
        GuGuDataCollegeSearchProvider provider = new GuGuDataCollegeSearchProvider(properties, new ObjectMapper());

        List<SchoolDictionary> result = provider.search("浙大", 10);

        assertThat(result).isNotEmpty();
        assertThat(result).extracting(SchoolDictionary::getSchoolName).contains("浙江大学");
        assertThat(result).allMatch(item -> item.getSchoolCode() != null && item.getProviderUuid() != null);
    }
}
