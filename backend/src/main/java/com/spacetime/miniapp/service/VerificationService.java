package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.EducationSubmitReq;
import com.spacetime.miniapp.dto.request.RealNameSubmitReq;
import com.spacetime.miniapp.dto.response.EducationVerifyDetailVO;
import com.spacetime.miniapp.dto.response.RealNameVerifyDetailVO;
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

    /** 查询实名认证页回显信息，只返回脱敏后的提交内容和状态。 */
    RealNameVerifyDetailVO getRealNameDetail(Long userId);

    /** 查询学历认证页回显信息，按最近一次学历审核记录返回提交快照。 */
    EducationVerifyDetailVO getEducationDetail(Long userId);

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

}
