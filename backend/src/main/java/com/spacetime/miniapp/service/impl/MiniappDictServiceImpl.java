package com.spacetime.miniapp.service.impl;

import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.miniapp.dto.response.DictOptionVO;
import com.spacetime.miniapp.dto.response.RegionOptionVO;
import com.spacetime.miniapp.service.MiniappDictService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

/** 移动端公开字典服务实现。 */
@Service
@RequiredArgsConstructor
public class MiniappDictServiceImpl implements MiniappDictService {

    /** 中国大陆省市区字典类型编码。 */
    private static final String CHINA_REGION_DICT_TYPE = "china_region";

    private final DictDataDao dictDataDao;

    /** 每次只读取一个层级，避免首屏返回完整省市区树。 */
    @Override
    public List<RegionOptionVO> locations(String parentCode) {
        Long parentId = 0L;
        String level = "PROVINCE";
        if (StringUtils.hasText(parentCode)) {
            SysDictData parent = dictDataDao.selectEnabledByTypeAndValue(
                    CHINA_REGION_DICT_TYPE, parentCode.trim());
            if (parent == null) {
                return Collections.emptyList();
            }
            parentId = parent.getId();
            level = parent.getParentId() != null && parent.getParentId() == 0L
                    ? "CITY"
                    : "DISTRICT";
        }

        final String resultLevel = level;
        return dictDataDao.selectChildren(CHINA_REGION_DICT_TYPE, parentId, true)
                .stream()
                .map(item -> toOption(item, resultLevel))
                .toList();
    }

    /** 基础资料字典选项数量较小，一次返回可减少首登和资料编辑页的请求次数。 */
    @Override
    public Map<String, List<DictOptionVO>> profileOptions() {
        Map<String, List<DictOptionVO>> result = new LinkedHashMap<>();
        result.put("identity", options(ProfileDictType.IDENTITY));
        result.put("educationLevel", options(ProfileDictType.EDUCATION_LEVEL));
        result.put("industry", options(ProfileDictType.INDUSTRY));
        result.put("occupation", options(ProfileDictType.OCCUPATION));
        result.put("annualIncome", options(ProfileDictType.ANNUAL_INCOME));
        result.put("maritalStatus", options(ProfileDictType.MARITAL_STATUS));
        return result;
    }

    private List<DictOptionVO> options(String dictType) {
        return dictDataDao.selectByDictType(dictType).stream().map(item -> {
            DictOptionVO option = new DictOptionVO();
            option.setCode(item.getDictValue());
            option.setLabel(item.getDictLabel());
            return option;
        }).toList();
    }

    private RegionOptionVO toOption(SysDictData item, String level) {
        RegionOptionVO option = new RegionOptionVO();
        option.setCode(item.getDictValue());
        option.setName(item.getDictLabel());
        option.setLevel(level);
        option.setHasChildren(Boolean.TRUE.equals(item.getHasChildren()));
        return option;
    }
}
