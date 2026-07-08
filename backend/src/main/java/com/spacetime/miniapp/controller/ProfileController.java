package com.spacetime.miniapp.controller;

import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.OpenTextSubmitReq;
import com.spacetime.miniapp.dto.request.ProfileMediaSubmitReq;
import com.spacetime.miniapp.dto.request.ProfileInitSaveReq;
import com.spacetime.miniapp.dto.request.ProfileUpdateReq;
import com.spacetime.miniapp.dto.request.VoiceIntroSubmitReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.OpenTextAuditVO;
import com.spacetime.miniapp.dto.response.ProfileDetailVO;
import com.spacetime.miniapp.dto.response.ProfileInitStatusVO;
import com.spacetime.miniapp.dto.response.ProfileMediaVO;
import com.spacetime.miniapp.dto.response.VoiceIntroVO;
import com.spacetime.miniapp.service.OpenTextAuditService;
import com.spacetime.miniapp.service.ProfileMediaService;
import com.spacetime.miniapp.service.ProfileService;
import com.spacetime.miniapp.service.VoiceIntroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序用户资料接口
 * 覆盖首登五步初始化、资料详情查看、增量编辑、准入状态查询
 */
@RestController
@RequestMapping("/miniapp/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final OpenTextAuditService openTextAuditService;
    private final VoiceIntroService voiceIntroService;
    private final ProfileMediaService profileMediaService;

    /**
     * 查询首登资料初始化状态
     * @return 当前步骤、下一步、已保存字段
     */
    @GetMapping("/init-status")
    public R<ProfileInitStatusVO> initStatus() {
        return R.ok(profileService.getInitStatus(currentUserId()));
    }

    /**
     * 保存首登五步资料中的任一步
     * @param req 步骤号 + 当前步骤填写的字段
     * @return 更新后的步骤状态
     */
    @PostMapping("/init-save")
    public R<ProfileInitStatusVO> initSave(@Valid @RequestBody ProfileInitSaveReq req) {
        return R.ok(profileService.saveInit(currentUserId(), req));
    }

    /**
     * 完成首登资料初始化（第5步后）
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

    /** 提交头像、相册、背景图或学历材料，进入资料媒体审核 */
    @PostMapping("/media")
    public R<ProfileMediaVO> submitMedia(@RequestBody ProfileMediaSubmitReq req) {
        return R.ok(profileMediaService.submitMedia(currentUserId(), req));
    }

    /** 删除资料媒体 */
    @DeleteMapping("/media/{id}")
    public R<Void> deleteMedia(@PathVariable Long id) {
        profileMediaService.deleteMedia(currentUserId(), id);
        return R.ok();
    }

    /** 提交开放性文字，不包含语音介绍 */
    @PostMapping("/open-text")
    public R<OpenTextAuditVO> openText(@RequestBody OpenTextSubmitReq req) {
        return R.ok(openTextAuditService.submitOpenText(currentUserId(), req));
    }

    /** 提交语音介绍，走音频安全机审，不做语音转文字 */
    @PostMapping("/voice-intro")
    public R<VoiceIntroVO> voiceIntro(@RequestBody VoiceIntroSubmitReq req) {
        return R.ok(voiceIntroService.submitVoiceIntro(currentUserId(), req));
    }

    /** 删除当前有效语音介绍 */
    @DeleteMapping("/voice-intro")
    public R<Void> deleteVoiceIntro() {
        voiceIntroService.deleteVoiceIntro(currentUserId());
        return R.ok();
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
