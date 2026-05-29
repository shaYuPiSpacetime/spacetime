package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.MiniappEntryConfigVO;
import com.spacetime.miniapp.service.MiniappMobileConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 小程序移动端配置控制器
 */
@RestController
@RequestMapping("/miniapp/mobile-config")
@RequiredArgsConstructor
public class MiniappMobileConfigController {

    private final MiniappMobileConfigService miniappMobileConfigService;

    /**
     * 查询指定页面的入口配置列表
     *
     * @param pageCode 页面编码
     * @return 入口配置列表
     */
    @GetMapping("/entries")
    public R<List<MiniappEntryConfigVO>> entries(@RequestParam String pageCode) {
        return R.ok(miniappMobileConfigService.getEntries(pageCode));
    }
}
