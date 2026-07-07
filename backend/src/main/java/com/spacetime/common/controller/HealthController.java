package com.spacetime.common.controller;

import com.spacetime.common.result.R;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 服务健康检查接口。
 */
@RestController
public class HealthController {

    /** 返回最小健康状态，不暴露运行环境信息。 */
    @GetMapping("/health")
    public R<String> health() {
        return R.ok("ok");
    }
}
