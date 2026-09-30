package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.ReverseGeocodeReq;
import com.spacetime.miniapp.dto.response.ReverseGeocodeVO;
import com.spacetime.miniapp.service.MiniappLocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 小程序登录态定位接口。 */
@RestController
@RequestMapping("/miniapp/location")
@RequiredArgsConstructor
public class MiniappLocationController {
    /** 小程序定位服务。 */
    private final MiniappLocationService locationService;

    /**
     * 根据 GCJ-02 经纬度获取省市名称。
     * @param req 经纬度请求体
     * @return 省市名称
     */
    @PostMapping("/reverse-geocode")
    public R<ReverseGeocodeVO> reverseGeocode(@Valid @RequestBody ReverseGeocodeReq req) {
        return R.ok(locationService.reverseGeocode(req.getLatitude(), req.getLongitude()));
    }
}
