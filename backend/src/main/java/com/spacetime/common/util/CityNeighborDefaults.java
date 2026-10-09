package com.spacetime.common.util;

import cn.hutool.json.JSONUtil;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 随版本发布的默认城市邻接关系，运营可覆盖，无需线上请求地图服务。 */
public final class CityNeighborDefaults {
    private static final Map<String, List<String>> DEFAULTS = load();
    private CityNeighborDefaults() { }

    /** 返回只读默认映射，包含直辖市历史编码兼容。 */
    public static Map<String, List<String>> mapping() {
        return DEFAULTS;
    }

    private static Map<String, List<String>> load() {
        try (InputStream stream = CityNeighborDefaults.class.getResourceAsStream("/data/neighbor-cities.json")) {
            if (stream == null) throw new IllegalStateException("默认城市邻接数据缺失");
            var json = JSONUtil.parseObj(new String(stream.readAllBytes(), StandardCharsets.UTF_8));
            Map<String, List<String>> result = new LinkedHashMap<>();
            for (String code : json.keySet()) {
                result.put(code, List.copyOf(json.getJSONArray(code).toList(String.class)));
            }
            return Map.copyOf(result);
        } catch (IOException error) {
            throw new IllegalStateException("默认城市邻接数据读取失败", error);
        }
    }
}
