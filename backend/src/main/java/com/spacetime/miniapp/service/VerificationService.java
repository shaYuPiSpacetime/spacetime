package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.EducationSubmitReq;
import com.spacetime.miniapp.dto.request.RealNameSubmitReq;
import com.spacetime.miniapp.dto.response.VerificationStatusVO;

/**
 * 用户认证服务
 */
public interface VerificationService {
    /**
     * 查询认证状态
     * @param userId 用户ID
     * @return 各认证项的状态、驳回原因、认证等级
     */
    VerificationStatusVO getStatus(Long userId);

    /**
     * 提交实名认证
     * @param userId 用户ID
     * @param req 真实姓名 + 身份证号
     * @return 提交后的认证状态
     */
    VerificationStatusVO submitRealName(Long userId, RealNameSubmitReq req);

    /**
     * 提交学历认证
     * @param userId 用户ID
     * @param req 认证方式
     * @return 提交后的认证状态
     */
    VerificationStatusVO submitEducation(Long userId, EducationSubmitReq req);

    /**
     * 提交头像认证
     * @param userId 用户ID
     * @return 提交后的认证状态
     */
    VerificationStatusVO verifyAvatar(Long userId);
}
