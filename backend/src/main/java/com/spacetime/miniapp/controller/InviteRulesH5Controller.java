package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.InviteRulesH5VO;
import com.spacetime.miniapp.service.PromotionInviteQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * PRD-06 H5 内容接口的邀请规则实现。
 */
@RestController
@RequestMapping("/miniapp/app/h5-content")
@RequiredArgsConstructor
public class InviteRulesH5Controller {
    private final PromotionInviteQueryService service;

    @GetMapping("/invite_rules")
    public R<InviteRulesH5VO> inviteRules() {
        return R.ok(service.rulesH5());
    }
}
