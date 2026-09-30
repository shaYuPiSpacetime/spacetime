package com.spacetime.miniapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 腾讯地图逆地址解析得到的省市名称。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReverseGeocodeVO {
    /** 省级行政区名称。 */
    private String province;
    /** 市级行政区名称。 */
    private String city;
}
