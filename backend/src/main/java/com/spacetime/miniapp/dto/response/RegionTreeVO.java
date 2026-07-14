package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/** 小程序省市两级地区树节点。 */
@Data
public class RegionTreeVO {
    /** 中国大陆行政区划编码，提交业务接口时使用。 */
    private String code;
    /** 地区名称。 */
    private String name;
    /** PROVINCE=省，CITY=市。 */
    private String level;
    /** 下级地区；两级接口中城市节点固定为空数组。 */
    private List<RegionTreeVO> children = new ArrayList<>();
}
