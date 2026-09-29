package com.spacetime.common.util;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.spacetime.common.entity.AppUser;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MunicipalityLocationCodesTest {
    @BeforeAll
    static void initTableInfo() {
        TableInfoHelper.initTableInfo(
                new MapperBuilderAssistant(new MybatisConfiguration(), ""), AppUser.class);
    }

    @Test
    void matchesNewDistrictWithLegacyVirtualCityWithoutMixingDifferentDistricts() {
        assertThat(MunicipalityLocationCodes.matches("500233", "500200")).isTrue();
        assertThat(MunicipalityLocationCodes.matches("500200", "500233")).isTrue();
        assertThat(MunicipalityLocationCodes.matches("500233", "500234")).isFalse();
        assertThat(MunicipalityLocationCodes.matches("310115", "310100")).isTrue();
        assertThat(MunicipalityLocationCodes.matches("320100", "320101")).isFalse();
    }

    @Test
    void filterContainsLegacyParentAndDoesNotShowVirtualCountyLabel() {
        LambdaQueryWrapper<AppUser> wrapper = new LambdaQueryWrapper<>();
        MunicipalityLocationCodes.applyCityFilter(wrapper, List.of("500233", "320100"));

        assertThat(wrapper.getSqlSegment()).contains("location_city");
        assertThat(wrapper.getParamNameValuePairs().values()).contains("500233", "500200", "320100");
        assertThat(MunicipalityLocationCodes.displayName("500200", "县")).isEqualTo("重庆市");
        assertThat(MunicipalityLocationCodes.cityGroupCode("500233")).isEqualTo("500200");
    }

    @Test
    void hometownFilterAlsoMatchesLegacyVirtualCity() {
        LambdaQueryWrapper<AppUser> wrapper = new LambdaQueryWrapper<>();
        MunicipalityLocationCodes.applyHometownFilter(wrapper, List.of("500233"));

        assertThat(wrapper.getSqlSegment()).contains("hometown_city");
        assertThat(wrapper.getParamNameValuePairs().values()).contains("500233", "500200");
    }
}
