package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.MiniappHotWordVO;
import com.spacetime.miniapp.dto.response.MiniappSearchConfigVO;
import com.spacetime.miniapp.dto.response.SearchValidationResult;

import java.util.List;

/**
 * 小程序搜索配置服务接口
 */
public interface MiniappSearchConfigService {

    /**
     * 查询搜索热词列表
     *
     * @param limit 返回条数上限
     * @return 热词列表
     */
    List<MiniappHotWordVO> getHotWords(int limit);

    /**
     * 查询搜索配置（空状态文案、违规文案、默认排序、Tab 列表）
     *
     * @return 搜索配置
     */
    MiniappSearchConfigVO getSearchConfig();

    /**
     * 校验搜索关键词是否命中屏蔽词
     *
     * @param keyword 用户输入的关键词
     * @return 校验结果
     */
    SearchValidationResult validateKeyword(String keyword);
}
