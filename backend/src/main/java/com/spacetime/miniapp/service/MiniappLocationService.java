package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.ReverseGeocodeVO;

/** 小程序定位服务。 */
public interface MiniappLocationService {
    /**
     * 根据 GCJ-02 经纬度识别城市。
     * @param latitude 纬度
     * @param longitude 经度
     * @return 原始省市名称
     */
    ReverseGeocodeVO reverseGeocode(double latitude, double longitude);
}
