package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.UserAssetGrantReq;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.entity.UserAssetGrant;
import com.spacetime.common.enums.AssetGrantSourceEnum;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.common.service.UserAssetGrantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/** 后台资产赠送入口；无权用户不得直接发放。 */
@RestController
@RequestMapping("/admin/commercial/users/{userId}/grants")
@RequiredArgsConstructor
public class UserAssetGrantController {
    private final UserAssetGrantService service;
    /** 赠送会员、千寻币并返回实际入账回执。 */
    @PostMapping
    @RequirePermission("commercial:user:grant")
    public R<UserAssetGrant> grant(@PathVariable Long userId, @Valid @RequestBody UserAssetGrantReq req) {
        var operator = UserContextHolder.get();
        return R.ok(service.grant(userId, req.getVipDays().intValueExact(), req.getCoinAmount().intValueExact(),
                "admin:" + req.getRequestId(), AssetGrantSourceEnum.ADMIN.getCode(), req.getReason(),
                operator.getId(), operator.getNickname()));
    }
    /** 查看用户最近五十笔赠送记录。 */
    @GetMapping
    @RequirePermission("commercial:user:view")
    public R<List<UserAssetGrant>> recent(@PathVariable Long userId) { return R.ok(service.recent(userId)); }
}
