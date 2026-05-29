package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.MiniappEntryConfigVO;

import java.util.List;

/**
 * 小程序移动端配置服务接口
 */
public interface MiniappMobileConfigService {

    /**
     * 查询指定页面的入口配置列表
     *
     * @param pageCode 页面编码
     * @return 入口配置列表
     */
    List<MiniappEntryConfigVO> getEntries(String pageCode);
}
