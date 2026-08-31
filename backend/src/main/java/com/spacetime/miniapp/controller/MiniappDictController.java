package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.RegionOptionVO;
import com.spacetime.miniapp.dto.response.RegionTreeVO;
import com.spacetime.miniapp.dto.response.SchoolOptionVO;
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

    /** 获取中国大陆省市两级地区树，供小程序省市选择器一次性加载。 */
    @GetMapping("/locations/two-level")
    public R<List<RegionTreeVO>> twoLevelLocations() {
        return R.ok(miniappDictService.twoLevelLocations());
    }

    /** 获取基础资料页字典选项；code 用于提交，label 用于展示。 */
    @GetMapping("/profile-options")
    public R<Map<String, Object>> profileOptions() {
        return R.ok(miniappDictService.profileOptions());
    }

    /** 搜索中国大陆高校；不足10条时服务端自动查询第三方并写回本地字典。 */
    @GetMapping("/schools")
    public R<List<SchoolOptionVO>> schools(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "10") int limit) {
        String normalized = keyword == null ? "" : keyword.trim();
        if (normalized.length() < 2) {
            throw new IllegalArgumentException("学校关键词至少输入2个字符");
        }
        return R.ok(miniappDictService.searchSchools(normalized, Math.min(Math.max(limit, 1), 20)));
    }
}
