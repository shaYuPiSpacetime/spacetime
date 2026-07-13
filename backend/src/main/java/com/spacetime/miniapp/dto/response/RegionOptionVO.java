package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 移动端地区分级选项。 */
@Data
public class RegionOptionVO {
    /** 中国大陆行政区划编码。 */
    private String code;
    /** 地区名称。 */
    private String name;
    /** PROVINCE=省，CITY=市，DISTRICT=区县。 */
    private String level;
    /** 是否还有下一级地区。 */
    private Boolean hasChildren;
}
