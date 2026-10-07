package com.spacetime.common.util;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

/** 默认邻接城市覆盖及直辖市兼容回归。 */
class CityNeighborDefaultsTest {
    @Test
    void defaultsShouldCoverMainlandAndSupportShanghaiLegacyCodes() {
        var cities = CityNeighborDefaults.mapping();
        assertThat(cities).hasSizeGreaterThanOrEqualTo(300);
        assertThat(cities.get("310100")).contains("320500", "330400", "320600").doesNotContain("320100");
        assertThat(cities.get("310200")).isEqualTo(cities.get("310100"));
        assertThat(cities.get("320500")).contains("310100");
        cities.forEach((code, adjacent) -> {
            assertThat(code).matches("\\d{6}");
            assertThat(adjacent).doesNotContain(code).doesNotHaveDuplicates();
            adjacent.forEach(neighbor -> assertThat(neighbor).matches("\\d{6}"));
        });
    }
}
