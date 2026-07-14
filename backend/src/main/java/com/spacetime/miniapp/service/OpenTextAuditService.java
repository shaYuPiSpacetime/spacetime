package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.AboutMeAnswerSubmitReq;
import com.spacetime.miniapp.dto.request.IntroductionSubmitReq;
import com.spacetime.miniapp.dto.response.AboutMeDetailVO;
import com.spacetime.miniapp.dto.response.IntroductionDetailVO;
import com.spacetime.miniapp.dto.response.OpenTextAuditVO;

/** 小程序开放性文字审核服务。 */
public interface OpenTextAuditService {
    /** 查询自我介绍页回显，包含本人最新提交和当前对外生效内容。 */
    IntroductionDetailVO getIntroductionDetail(Long userId);

    /** 提交自我介绍，固定按 ABOUT_ME 进入开放性文字审核。 */
    OpenTextAuditVO submitIntroduction(Long userId, IntroductionSubmitReq req);

    /** 查询关于我固定题目和对应审核回显。 */
    AboutMeDetailVO getAboutMeDetail(Long userId);

    /** 提交关于我某个固定题目的回答，进入开放性文字审核。 */
    OpenTextAuditVO submitAboutMeAnswer(Long userId, AboutMeAnswerSubmitReq req);

}
