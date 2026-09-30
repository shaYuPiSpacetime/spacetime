package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** 小程序定位坐标请求。 */
@Data
public class ReverseGeocodeReq {
    /** GCJ-02 纬度。 */
    @NotNull(message = "纬度不能为空")
    private Double latitude;

    /** GCJ-02 经度。 */
    @NotNull(message = "经度不能为空")
    private Double longitude;
}
