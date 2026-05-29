package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.MiniappHotWordVO;
import com.spacetime.miniapp.dto.response.MiniappSearchConfigVO;
import com.spacetime.miniapp.service.MiniappSearchConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 小程序搜索配置控制器
 */
@RestController
@RequestMapping("/miniapp/search")
@RequiredArgsConstructor
public class MiniappSearchConfigController {

    private final MiniappSearchConfigService miniappSearchConfigService;

    /**
     * 查询搜索热词列表
     *
     * @param limit 返回条数上限
     * @return 热词列表
     */
    @GetMapping("/hot-words")
    public R<List<MiniappHotWordVO>> hotWords(@RequestParam(defaultValue = "10") int limit) {
        return R.ok(miniappSearchConfigService.getHotWords(limit));
    }

    /**
     * 查询搜索配置
     *
     * @return 搜索配置
     */
    @GetMapping("/config")
    public R<MiniappSearchConfigVO> config() {
        return R.ok(miniappSearchConfigService.getSearchConfig());
    }
}
