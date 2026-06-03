package com.spacetime.miniapp.controller;

import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.EducationSubmitReq;
import com.spacetime.miniapp.dto.request.RealNameSubmitReq;
import com.spacetime.miniapp.dto.response.VerificationStatusVO;
import com.spacetime.miniapp.service.VerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序认证中心接口
 * 覆盖实名认证、学历认证、头像认证的状态查询与提交
 */
@RestController
@RequestMapping("/miniapp/verify")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    /**
     * 查询当前用户的认证状态
     * @return 各认证项的状态、驳回原因、认证等级
     */
    @GetMapping("/status")
    public R<VerificationStatusVO> status() {
        return R.ok(verificationService.getStatus(currentUserId()));
    }

    /**
     * 提交实名认证
     * @param req 真实姓名 + 身份证号
     * @return 提交后的认证状态（首版 mock 直接通过）
     */
    @PostMapping("/real-name")
    public R<VerificationStatusVO> submitRealName(@Valid @RequestBody RealNameSubmitReq req) {
        return R.ok(verificationService.submitRealName(currentUserId(), req));
    }

    /**
     * 提交学历认证
     * @param req 认证方式（CHSI/学信网在线验证码等）
     * @return 提交后的认证状态（首版 mock 设为审核中）
     */
    @PostMapping("/education")
    public R<VerificationStatusVO> submitEducation(@Valid @RequestBody EducationSubmitReq req) {
        return R.ok(verificationService.submitEducation(currentUserId(), req));
    }

    /**
     * 提交头像认证
     * 要求用户已上传头像，首版 mock 直接通过
     * @return 提交后的认证状态
     */
    @PostMapping("/avatar")
    public R<VerificationStatusVO> verifyAvatar() {
        return R.ok(verificationService.verifyAvatar(currentUserId()));
    }

    /** 从 Token 上下文中获取当前用户ID */
    private Long currentUserId() {
        return UserContextHolder.get().getId();
    }
}
