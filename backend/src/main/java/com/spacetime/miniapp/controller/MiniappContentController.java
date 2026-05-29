package com.spacetime.miniapp.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.MiniappArticleDetailVO;
import com.spacetime.miniapp.dto.response.MiniappArticleVO;
import com.spacetime.miniapp.service.MiniappContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * 小程序内容控制器
 */
@RestController
@RequestMapping("/miniapp/content")
@RequiredArgsConstructor
public class MiniappContentController {

    private final MiniappContentService miniappContentService;

    /**
     * 分页查询公告列表
     *
     * @param page 页码
     * @param size 每页条数
     * @return 公告分页数据
     */
    @GetMapping("/announcements")
    public R<Page<MiniappArticleVO>> announcements(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return R.ok(miniappContentService.getAnnouncements(page, size));
    }

    /**
     * 分页查询帮助文档列表
     *
     * @param category 子分类
     * @param page     页码
     * @param size     每页条数
     * @return 帮助文档分页数据
     */
    @GetMapping("/help-docs")
    public R<Page<MiniappArticleVO>> helpDocs(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return R.ok(miniappContentService.getHelpDocs(category, page, size));
    }

    /**
     * 查询规则类文章列表
     *
     * @param type 文章类型
     * @return 规则文章列表
     */
    @GetMapping("/rules")
    public R<List<MiniappArticleVO>> rules(@RequestParam(defaultValue = "RULE") String type) {
        return R.ok(miniappContentService.getRules(type));
    }

    /**
     * 查询文章详情
     *
     * @param id 文章 ID
     * @return 文章详情
     */
    @GetMapping("/articles/{id}")
    public R<MiniappArticleDetailVO> articleDetail(@PathVariable Long id) {
        return R.ok(miniappContentService.getArticleDetail(id));
    }

    /**
     * 查询公开配置项
     *
     * @param keys 配置键（逗号分隔）
     * @return 配置键值对
     */
    @GetMapping("/config")
    public R<Map<String, String>> config(@RequestParam String keys) {
        List<String> keyList = Arrays.asList(keys.split(","));
        return R.ok(miniappContentService.getPublicConfigs(keyList));
    }
}