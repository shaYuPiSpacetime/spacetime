package com.spacetime.common.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
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

    private final DictDataDao dictDataDao;

    /** 查询某个资料字典的全部启用选项。 */
    public List<SysDictData> options(String dictType) {
        return dictDataDao.selectByDictType(dictType);
    }

    /** 一次加载某类字典的 code-label 映射，供列表批量转换，避免逐行查询。 */
    public Map<String, String> labels(String dictType) {
        Map<String, String> result = new LinkedHashMap<>();
        for (SysDictData item : options(dictType)) {
            result.put(item.getDictValue(), item.getDictLabel());
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
            result.put(item.getDictValue(), item.getDictLabel());
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
        if (city == null || !Objects.equals(province.getId(), city.getParentId())) {
            throw unsupportedRegion(fieldLabel);
        }
        if (StrUtil.isBlank(districtValue)) {
            return;
        }
        SysDictData district = enabledRegion(districtValue);
        if (district == null || !Objects.equals(city.getId(), district.getParentId())) {
            throw unsupportedRegion(fieldLabel);
        }
    }

    private SysDictData enabledRegion(String code) {
        return StrUtil.isBlank(code)
                ? null
                : dictDataDao.selectEnabledByTypeAndValue(CHINA_REGION_DICT_TYPE, code);
    }

    private BusinessException unsupportedRegion(String fieldLabel) {
        return new BusinessException("REGION_NOT_SUPPORTED：" + fieldLabel + "必须使用有效的中国大陆省市区编码");
    }

    /** 将业务表中的 code 转换为中文标签；历史异常值暂按原值返回，便于排查。 */
    public String label(String dictType, String code) {
        if (StrUtil.isBlank(code)) {
            return "-";
        }
        SysDictData data = dictDataDao.selectEnabledByTypeAndValue(dictType, code.trim());
        return data == null ? code : data.getDictLabel();
    }

    /** 使用已批量加载的映射转换标签。 */
    public String label(Map<String, String> labels, String code) {
        if (StrUtil.isBlank(code)) {
            return "-";
        }
        return labels.getOrDefault(code, code);
    }
}
