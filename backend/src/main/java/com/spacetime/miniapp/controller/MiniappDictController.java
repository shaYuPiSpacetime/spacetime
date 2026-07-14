package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.RegionOptionVO;
import com.spacetime.miniapp.service.MiniappDictService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 移动端公开字典接口。
 */
@RestController
@RequestMapping("/miniapp/dict")
@RequiredArgsConstructor
public class MiniappDictController {

    private final MiniappDictService miniappDictService;

    /** 获取中国大陆省市区地区树。 */
    @GetMapping("/locations")
    public R<List<RegionOptionVO>> locations(
            @RequestParam(required = false) String parentCode) {
        return R.ok(miniappDictService.locations(parentCode));
    }

    /** 获取基础资料页字典选项；code 用于提交，label 用于展示。 */
    @GetMapping("/profile-options")
    public R<Map<String, Object>> profileOptions() {
        return R.ok(miniappDictService.profileOptions());
    }
}
