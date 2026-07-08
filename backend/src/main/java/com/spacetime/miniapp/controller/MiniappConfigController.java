package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.service.MiniappPrd01ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 移动端配置接口。
 */
@RestController
@RequestMapping("/miniapp/config")
@RequiredArgsConstructor
public class MiniappConfigController {

    private final MiniappPrd01ConfigService miniappPrd01ConfigService;

    /** 获取 PRD01 用户准入与资料认证初始化配置。 */
    @GetMapping("/prd01")
    public R<Map<String, Object>> prd01() {
        return R.ok(miniappPrd01ConfigService.getPrd01Config());
    }
}
