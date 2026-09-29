package com.spacetime.common.util;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.spacetime.common.entity.AppUser;

import java.util.List;
import java.util.Map;
import java.util.Set;

/** 直辖市旧市级编码与新区县编码在筛选时的兼容规则。 */
public final class MunicipalityLocationCodes {
    private static final Set<String> PREFIXES = Set.of("11", "12", "31", "50");
    private static final Map<String, String> NAMES = Map.of(
            "11", "北京市", "12", "天津市", "31", "上海市", "50", "重庆市");

    private MunicipalityLocationCodes() {
    }

    /** 将直辖市新旧地区编码兼容规则追加到候选查询。 */
    public static void applyCityFilter(LambdaQueryWrapper<AppUser> wrapper, List<String> targetCodes) {
        applyRegionFilter(wrapper, targetCodes, AppUser::getLocationCity);
    }

    /** 家乡偏好与现居地使用同一套新旧直辖市编码兼容规则。 */
    public static void applyHometownFilter(LambdaQueryWrapper<AppUser> wrapper, List<String> targetCodes) {
        applyRegionFilter(wrapper, targetCodes, AppUser::getHometownCity);
    }

    private static void applyRegionFilter(LambdaQueryWrapper<AppUser> wrapper, List<String> targetCodes,
                                          SFunction<AppUser, ?> column) {
        if (targetCodes == null || targetCodes.isEmpty()) {
            return;
        }
        wrapper.and(group -> {
            for (int i = 0; i < targetCodes.size(); i++) {
                String code = targetCodes.get(i);
                if (i > 0) {
                    group.or();
                }
                if (isVirtualCity(code)) {
                    // 老偏好选择了“市辖区/县”时，也能覆盖之后保存为区县码的用户。
                    group.likeRight(column, code.substring(0, 4));
                } else if (isDistrict(code)) {
                    // 老用户只保存到市级，无法反推具体区县；在迁移前按原市级范围兼容匹配。
                    group.in(column, code, parentCity(code));
                } else {
                    group.eq(column, code);
                }
            }
        });
    }

    /** 判断一个目标地区编码是否涵盖候选用户的地区编码。 */
    public static boolean matches(String targetCode, String candidateCode) {
        if (targetCode == null || candidateCode == null) {
            return false;
        }
        if (targetCode.equals(candidateCode)) {
            return true;
        }
        if (isVirtualCity(targetCode)) {
            return candidateCode.startsWith(targetCode.substring(0, 4));
        }
        return isDistrict(targetCode) && parentCity(targetCode).equals(candidateCode);
    }

    /** 判断任一目标地区是否涵盖候选用户地区。 */
    public static boolean matchesAny(List<String> targetCodes, String candidateCode) {
        return targetCodes != null && targetCodes.stream().anyMatch(code -> matches(code, candidateCode));
    }

    /** 旧虚拟“市辖区/县”只展示直辖市名称，避免误认作真实城市。 */
    public static String displayName(String code, String dictionaryLabel) {
        return isVirtualCity(code) ? NAMES.get(code.substring(0, 2)) : dictionaryLabel;
    }

    /** 周边城市配置按市级编码维护，区县需回到所属市级配置键。 */
    public static String cityGroupCode(String code) {
        return isDistrict(code) ? parentCity(code) : code;
    }

    private static boolean isVirtualCity(String code) {
        return isMunicipalityCode(code) && !code.endsWith("0000") && code.endsWith("00");
    }

    private static boolean isDistrict(String code) {
        return isMunicipalityCode(code) && !code.endsWith("00");
    }

    private static boolean isMunicipalityCode(String code) {
        return code != null && code.matches("\\d{6}") && PREFIXES.contains(code.substring(0, 2));
    }

    private static String parentCity(String districtCode) {
        return districtCode.substring(0, 4) + "00";
    }
}
