package com.spacetime.miniapp.controller;

import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.ProfileInitSaveReq;
import com.spacetime.miniapp.dto.request.ProfileUpdateReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.ProfileDetailVO;
import com.spacetime.miniapp.dto.response.ProfileInitStatusVO;
import com.spacetime.miniapp.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序用户资料接口
 * 覆盖首登三步初始化、资料详情查看、增量编辑、准入状态查询
 */
@RestController
@RequestMapping("/miniapp/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    /**
     * 查询首登资料初始化状态
     * @return 当前步骤、下一步、已保存字段
     */
    @GetMapping("/init-status")
    public R<ProfileInitStatusVO> initStatus() {
        return R.ok(profileService.getInitStatus(currentUserId()));
    }

    /**
     * 保存首登资料（第1步或第2步）
     * @param req 步骤号 + 当前步骤填写的字段
     * @return 更新后的步骤状态
     */
    @PostMapping("/init-save")
    public R<ProfileInitStatusVO> initSave(@Valid @RequestBody ProfileInitSaveReq req) {
        return R.ok(profileService.saveInit(currentUserId(), req));
    }

    /**
     * 完成首登资料初始化（第3步）
     * 校验必填字段，标记 firstLoginCompleted=1，计算资料完整度
     * @param req 最后一步的字段
     * @return 完整资料详情
     */
    @PostMapping("/init-complete")
    public R<ProfileDetailVO> initComplete(@Valid @RequestBody ProfileInitSaveReq req) {
        return R.ok(profileService.completeInit(currentUserId(), req));
    }

    /**
     * 查看自己的资料详情
     * @return 完整资料 + 准入状态
     */
    @GetMapping("/detail")
    public R<ProfileDetailVO> detail() {
        return R.ok(profileService.getDetail(currentUserId()));
    }

    /**
     * 增量更新资料（PATCH）
     * null 字段不更新；修改头像/关于我/希望TA了解会重置对应审核状态
     * @param req 需要更新的字段
     * @return 更新后的完整资料
     */
    @PatchMapping
    public R<ProfileDetailVO> update(@RequestBody ProfileUpdateReq req) {
        return R.ok(profileService.updateProfile(currentUserId(), req));
    }

    /**
     * 查询当前用户的准入状态
     * 返回浏览卡片、匹配、曝光三种能力的开关及阻断原因
     * @return 准入状态
     */
    @GetMapping("/access-status")
    public R<AccessStatusVO> accessStatus() {
        return R.ok(profileService.getAccessStatus(currentUserId()));
    }

    /** 从 Token 上下文中获取当前用户ID */
    private Long currentUserId() {
        return UserContextHolder.get().getId();
    }
}
