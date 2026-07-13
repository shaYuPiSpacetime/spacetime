package com.spacetime.common.service;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 用户资料业务字典服务。
 *
 * 业务表只保存字典 code，展示中文统一通过此服务解析，避免同一字段混存中英文。
 */
@Service
@RequiredArgsConstructor
public class ProfileDictionaryService {

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

    /** 校验并返回去除首尾空格后的标准 code。 */
    public String requireCode(String dictType, String code, String fieldLabel) {
        String normalized = StrUtil.trim(code);
        if (StrUtil.isBlank(normalized)
                || dictDataDao.selectEnabledByTypeAndValue(dictType, normalized) == null) {
            throw new BusinessException(fieldLabel + "编码不存在或已停用");
        }
        return normalized;
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
