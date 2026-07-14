package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.RegionOptionVO;
import com.spacetime.miniapp.dto.response.DictOptionVO;
import com.spacetime.miniapp.dto.response.RegionTreeVO;

import java.util.List;
import java.util.Map;

/**
 * 移动端公开字典服务。
 */
public interface MiniappDictService {
    /** 获取中国大陆省市区地区树。 */
    List<RegionOptionVO> locations(String parentCode);

    /** 获取中国大陆省市两级地区树，供小程序省市选择器一次性使用。 */
    List<RegionTreeVO> twoLevelLocations();

    /** 获取基础资料、扩展资料使用的字典选项；标签额外返回分组结构。 */
    Map<String, Object> profileOptions();
}
