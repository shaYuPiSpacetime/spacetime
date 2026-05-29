package com.spacetime.miniapp.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.*;
import com.spacetime.miniapp.dto.response.*;
import com.spacetime.miniapp.service.MiniappSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/miniapp/settings")
@RequiredArgsConstructor
public class MiniappSettingController {
    private final MiniappSettingService settingService;

    @GetMapping("/home")
    public R<MiniappSettingsHomeVO> home() {
        return R.ok(settingService.home(currentUserId()));
    }

    @GetMapping("/privacy")
    public R<MiniappPrivacySettingVO> privacy() {
        return R.ok(settingService.getPrivacy(currentUserId()));
    }

    @PutMapping("/privacy")
    public R<Void> savePrivacy(@RequestBody MiniappPrivacySettingReq req) {
        settingService.savePrivacy(currentUserId(), req);
        return R.ok();
    }

    @GetMapping("/notifications")
    public R<MiniappNotificationSettingVO> notifications() {
        return R.ok(settingService.getNotifications(currentUserId()));
    }

    @PutMapping("/notifications")
    public R<Void> saveNotifications(@RequestBody MiniappNotificationSettingReq req) {
        settingService.saveNotifications(currentUserId(), req);
        return R.ok();
    }

    @GetMapping("/blocks/blacklist")
    public R<Page<MiniappBlockedUserVO>> blacklist(@RequestParam(defaultValue = "1") int page,
                                                   @RequestParam(defaultValue = "20") int size) {
        return R.ok(settingService.listBlocks(currentUserId(), RelationBlockTypeEnum.BLACKLIST.getCode(), page, size));
    }

    @PostMapping("/blocks/blacklist")
    public R<Long> addBlacklist(@Valid @RequestBody MiniappRelationBlockReq req) {
        return R.ok(settingService.addBlock(currentUserId(), RelationBlockTypeEnum.BLACKLIST.getCode(), req));
    }

    @DeleteMapping("/blocks/blacklist/{id}")
    public R<Void> removeBlacklist(@PathVariable Long id) {
        settingService.removeBlock(currentUserId(), RelationBlockTypeEnum.BLACKLIST.getCode(), id);
        return R.ok();
    }

    @GetMapping("/blocks/hidden-dynamics")
    public R<Page<MiniappBlockedUserVO>> hiddenDynamics(@RequestParam(defaultValue = "1") int page,
                                                        @RequestParam(defaultValue = "20") int size) {
        return R.ok(settingService.listBlocks(currentUserId(), RelationBlockTypeEnum.HIDDEN_DYNAMIC.getCode(), page, size));
    }

    @PostMapping("/blocks/hidden-dynamics")
    public R<Long> addHiddenDynamics(@Valid @RequestBody MiniappRelationBlockReq req) {
        return R.ok(settingService.addBlock(currentUserId(), RelationBlockTypeEnum.HIDDEN_DYNAMIC.getCode(), req));
    }

    @DeleteMapping("/blocks/hidden-dynamics/{id}")
    public R<Void> removeHiddenDynamics(@PathVariable Long id) {
        settingService.removeBlock(currentUserId(), RelationBlockTypeEnum.HIDDEN_DYNAMIC.getCode(), id);
        return R.ok();
    }

    @GetMapping("/keyword-blocks")
    public R<List<MiniappUserKeywordVO>> keywords() {
        return R.ok(settingService.listKeywords(currentUserId()));
    }

    @PostMapping("/keyword-blocks")
    public R<Long> addKeyword(@Valid @RequestBody MiniappKeywordBlockReq req) {
        return R.ok(settingService.addKeyword(currentUserId(), req));
    }

    @DeleteMapping("/keyword-blocks/{id}")
    public R<Void> removeKeyword(@PathVariable Long id) {
        settingService.removeKeyword(currentUserId(), id);
        return R.ok();
    }

    private Long currentUserId() {
        return UserContextHolder.get().getId();
    }
}
