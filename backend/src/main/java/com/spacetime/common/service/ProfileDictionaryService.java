package com.spacetime.common.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.util.MunicipalityLocationCodes;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * 用户资料业务字典服务。
 *
 * 业务表只保存字典 code，展示中文统一通过此服务解析，避免同一字段混存中英文。
 */
@Service
@RequiredArgsConstructor
public class ProfileDictionaryService {

    private static final String CHINA_REGION_DICT_TYPE = "china_region";
    private static final Set<String> MUNICIPALITY_CODES = Set.of("110000", "120000", "310000", "500000");
    private static final Set<String> VIRTUAL_CITY_LABELS = Set.of("市辖区", "县");
    private static final Set<String> DIRECT_ADMIN_VIRTUAL_CITY_CODES = Set.of(
            "419000", "429000", "469000", "659000");

    private final DictDataDao dictDataDao;

    /** 查询某个资料字典的全部启用选项。 */
    public List<SysDictData> options(String dictType) {
        return dictDataDao.selectByDictType(dictType);
    }

    /** 一次加载某类字典的 code-label 映射，供列表批量转换，避免逐行查询。 */
    public Map<String, String> labels(String dictType) {
        Map<String, String> result = new LinkedHashMap<>();
        for (SysDictData item : options(dictType)) {
            result.put(item.getDictValue(), displayLabel(dictType, item));
        }
        return result;
    }

    /** 按当前业务页实际出现的 code 批量取中文标签，避免地区等大字典被列表页全量加载。 */
    public Map<String, String> labels(String dictType, Collection<String> codes) {
        Set<String> normalizedCodes = new LinkedHashSet<>();
        if (codes != null) {
            for (String code : codes) {
                String normalized = StrUtil.trim(code);
                if (StrUtil.isNotBlank(normalized)) {
                    normalizedCodes.add(normalized);
                }
            }
        }
        if (StrUtil.isBlank(dictType) || normalizedCodes.isEmpty()) {
            return Map.of();
        }
        LambdaQueryWrapper<SysDictData> wrapper = new LambdaQueryWrapper<SysDictData>()
                .eq(SysDictData::getDictType, dictType)
                .eq(SysDictData::getStatus, CommonStatusEnum.ENABLED.getCode())
                .in(SysDictData::getDictValue, normalizedCodes)
                .orderByAsc(SysDictData::getDictSort)
                .orderByAsc(SysDictData::getId);
        Map<String, String> result = new LinkedHashMap<>();
        for (SysDictData item : dictDataDao.selectList(wrapper)) {
            result.put(item.getDictValue(), displayLabel(dictType, item));
        }
        return result;
    }

    /** 校验并返回去除首尾空格后的标准 code。 */
    public String requireCode(String dictType, String code, String fieldLabel) {
        String normalized = StrUtil.trim(code);
        if (StrUtil.isBlank(normalized)
                || dictDataDao.selectEnabledByTypeAndValue(dictType, normalized) == null) {
            throw new BusinessException(fieldLabel + "编码不存在或已停用");
        }
        return normalized;
    }

    /**
     * 校验中国大陆省市区 code 及父子层级。
     * 允许只保存省或省市；一旦提交下级 code，就必须同时提交并匹配其父级。
     */
    public void requireChinaRegionPath(
            String provinceCode,
            String cityCode,
            String districtCode,
            String fieldLabel) {
        String provinceValue = StrUtil.trim(provinceCode);
        String cityValue = StrUtil.trim(cityCode);
        String districtValue = StrUtil.trim(districtCode);
        if (StrUtil.isAllBlank(provinceValue, cityValue, districtValue)) {
            return;
        }
        SysDictData province = enabledRegion(provinceValue);
        if (province == null || !Long.valueOf(0L).equals(province.getParentId())) {
            throw unsupportedRegion(fieldLabel);
        }
        if (StrUtil.isBlank(cityValue)) {
            if (StrUtil.isNotBlank(districtValue)) {
                throw unsupportedRegion(fieldLabel);
            }
            return;
        }
        SysDictData city = enabledRegion(cityValue);
        if (city == null) {
            throw unsupportedRegion(fieldLabel);
        }
        boolean flattenedVirtualCityDistrict = false;
        if (!Objects.equals(province.getId(), city.getParentId())) {
            flattenedVirtualCityDistrict = isFlattenedVirtualCityChild(provinceValue, province, city);
            if (!flattenedVirtualCityDistrict) {
                throw unsupportedRegion(fieldLabel);
            }
        }
        if (StrUtil.isBlank(districtValue)) {
            return;
        }
        if (flattenedVirtualCityDistrict) {
            throw unsupportedRegion(fieldLabel);
        }
        SysDictData district = enabledRegion(districtValue);
        if (district == null || !Objects.equals(city.getId(), district.getParentId())) {
            throw unsupportedRegion(fieldLabel);
        }
    }

    /** 两级选择器将虚拟中间层下的真实地区放在城市槽位，校验时仍须确认完整父子关系。 */
    private boolean isFlattenedVirtualCityChild(String provinceCode, SysDictData province, SysDictData district) {
        if (district.getParentId() == null) {
            return false;
        }
        SysDictData virtualCity = dictDataDao.selectById(district.getParentId());
        return isFlattenedVirtualCityChild(province, virtualCity);
    }

    /** 保存与导入共用虚拟行政层的父级判定，避免导入放宽地区规则。 */
    private static boolean isFlattenedVirtualCityChild(SysDictData province, SysDictData virtualCity) {
        return virtualCity != null
                && CHINA_REGION_DICT_TYPE.equals(virtualCity.getDictType())
                && CommonStatusEnum.ENABLED.getCode().equals(virtualCity.getStatus())
                && ((MUNICIPALITY_CODES.contains(province.getDictValue())
                        && VIRTUAL_CITY_LABELS.contains(virtualCity.getDictLabel()))
                        || DIRECT_ADMIN_VIRTUAL_CITY_CODES.contains(virtualCity.getDictValue()))
                && Objects.equals(province.getId(), virtualCity.getParentId());
    }

    /** 每个导入批次只加载一次启用地区树，不依赖全局 code-label 的顺序。 */
    public RegionImportResolver regionImportResolver() {
        return new RegionImportResolver(options(CHINA_REGION_DICT_TYPE));
    }

    /** 归一化后的地区编码，不改变资料保存的两级/三级口径。 */
    public record RegionPath(String provinceCode, String cityCode, String districtCode) {}

    /** 批次内按父级限定选项的解析器；同级歧义和错误编码均失败关闭。 */
    public static final class RegionImportResolver {
        private final Map<Long, SysDictData> byId = new HashMap<>();
        private final Map<Long, List<SysDictData>> byParent = new HashMap<>();

        private RegionImportResolver(List<SysDictData> options) {
            for (SysDictData item : options == null ? List.<SysDictData>of() : options) {
                if (!CHINA_REGION_DICT_TYPE.equals(item.getDictType())
                        || !CommonStatusEnum.ENABLED.getCode().equals(item.getStatus())
                        || Integer.valueOf(1).equals(item.getDeleted())
                        || item.getId() == null || item.getParentId() == null) {
                    continue;
                }
                byId.put(item.getId(), item);
                byParent.computeIfAbsent(item.getParentId(), ignored -> new ArrayList<>()).add(item);
            }
        }

        /** 只在该省/市的有效后代中解析 code、原始名称或客户端展示名称。 */
        public RegionPath normalize(String provinceValue, String cityValue, String districtValue, String fieldLabel) {
            if (StrUtil.isAllBlank(provinceValue, cityValue, districtValue)) {
                return new RegionPath("", "", "");
            }
            SysDictData province = requireMatch(children(0L), provinceValue, fieldLabel + "省份");
            if (StrUtil.isBlank(cityValue)) {
                if (StrUtil.isNotBlank(districtValue)) throw invalid(fieldLabel + "城市");
                return new RegionPath(province.getDictValue(), "", "");
            }
            List<SysDictData> cityMatches = matches(children(province.getId()), cityValue);
            // 同名直接城市和合法扁平城市也须共同消歧，不能偏向字典层级顺序。
            List<SysDictData> cityCandidates = new ArrayList<>(cityMatches);
            for (SysDictData virtualCity : children(province.getId())) {
                if (isFlattenedVirtualCityChild(province, virtualCity)) {
                    cityCandidates.addAll(matches(children(virtualCity.getId()), cityValue));
                }
            }
            if (cityCandidates.size() != 1) throw invalid(fieldLabel + "城市");
            SysDictData city = cityCandidates.getFirst();
            boolean flattened = !Objects.equals(province.getId(), city.getParentId());
            if (StrUtil.isBlank(districtValue)) {
                return new RegionPath(province.getDictValue(), city.getDictValue(), "");
            }
            if (flattened) throw invalid(fieldLabel + "区县");
            SysDictData district = requireMatch(children(city.getId()), districtValue, fieldLabel + "区县");
            return new RegionPath(province.getDictValue(), city.getDictValue(), district.getDictValue());
        }

        private List<SysDictData> children(Long parentId) {
            // Disabled/deleted intermediary nodes are not traversable.
            return parentId == 0L || byId.containsKey(parentId)
                    ? byParent.getOrDefault(parentId, List.of()) : List.of();
        }

        private SysDictData requireMatch(List<SysDictData> candidates, String value, String fieldLabel) {
            List<SysDictData> matched = matches(candidates, value);
            if (matched.size() != 1) throw invalid(fieldLabel);
            return matched.getFirst();
        }

        private List<SysDictData> matches(List<SysDictData> candidates, String value) {
            String normalized = StrUtil.trim(value);
            if (StrUtil.isBlank(normalized)) return List.of();
            // Numeric codes must match a code at this level, never a misleading display label.
            boolean code = normalized.matches("\\d{6}");
            return candidates.stream().filter(item -> normalized.equals(item.getDictValue())
                    || (!code && (normalized.equals(item.getDictLabel())
                    || normalized.equals(MunicipalityLocationCodes.displayName(item.getDictValue(), item.getDictLabel())))))
                    .toList();
        }

        private BusinessException invalid(String fieldLabel) {
            return new BusinessException(fieldLabel + "不存在、已停用、层级不匹配或名称有歧义，请使用有效地区编码");
        }
    }

    /** 判断指定省市节点是否存在启用的下一级行政区，供区县条件必填规则使用。 */
    public boolean hasEnabledRegionChildren(String parentCode) {
        SysDictData parent = enabledRegion(StrUtil.trim(parentCode));
        if (parent == null) {
            return false;
        }
        LambdaQueryWrapper<SysDictData> wrapper = new LambdaQueryWrapper<SysDictData>()
                .eq(SysDictData::getDictType, CHINA_REGION_DICT_TYPE)
                .eq(SysDictData::getStatus, CommonStatusEnum.ENABLED.getCode())
                .eq(SysDictData::getParentId, parent.getId())
                .last("LIMIT 1");
        List<SysDictData> children = dictDataDao.selectList(wrapper);
        return children != null && !children.isEmpty();
    }

    private SysDictData enabledRegion(String code) {
        return StrUtil.isBlank(code)
                ? null
                : dictDataDao.selectEnabledByTypeAndValue(CHINA_REGION_DICT_TYPE, code);
    }

    private BusinessException unsupportedRegion(String fieldLabel) {
        return new BusinessException("REGION_NOT_SUPPORTED：" + fieldLabel + "必须使用有效的中国大陆省市编码");
    }

    /** 将业务表中的 code 转换为用户展示标签；未知或空值不暴露内部编码。 */
    public String label(String dictType, String code) {
        if (StrUtil.isBlank(code)) {
            return null;
        }
        SysDictData data = dictDataDao.selectEnabledByTypeAndValue(dictType, code.trim());
        return data == null ? null : displayLabel(dictType, data);
    }

    private String displayLabel(String dictType, SysDictData data) {
        return CHINA_REGION_DICT_TYPE.equals(dictType)
                ? MunicipalityLocationCodes.displayName(data.getDictValue(), data.getDictLabel())
                : data.getDictLabel();
    }

    /** 使用已批量加载的映射转换用户展示标签，未知或空值不暴露内部编码。 */
    public String label(Map<String, String> labels, String code) {
        if (StrUtil.isBlank(code)) {
            return null;
        }
        return labels == null ? null : labels.get(code.trim());
    }
}
