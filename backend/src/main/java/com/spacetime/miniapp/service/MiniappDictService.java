package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.RegionOptionVO;
import com.spacetime.miniapp.dto.response.DictOptionVO;

import java.util.List;
import java.util.Map;

/**
 * 移动端公开字典服务。
 */
public interface MiniappDictService {
    /** 获取中国大陆省市区地区树。 */
    List<RegionOptionVO> locations(String parentCode);

    /** 获取基础资料页使用的身份、学历、职业、年收入和婚姻状况选项。 */
    Map<String, List<DictOptionVO>> profileOptions();
}
