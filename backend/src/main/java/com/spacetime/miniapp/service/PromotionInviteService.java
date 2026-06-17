package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionSourceTrace;
import com.spacetime.miniapp.dto.response.InviteBindVO;
import com.spacetime.miniapp.dto.response.InviteHomeVO;
import com.spacetime.miniapp.dto.response.InviteQrCodeVO;
import com.spacetime.miniapp.dto.response.InviteQrSourceVO;
import com.spacetime.miniapp.dto.response.InviteRecordVO;
import com.spacetime.miniapp.dto.response.InviteRulesVO;
import com.spacetime.miniapp.dto.response.InviteSourceTraceVO;

/**
 * 小程序邀请推广服务接口
 */
public interface PromotionInviteService {
    /** 邀请首页 */
    InviteHomeVO home(Long userId);
    /** 活动规则 */
    InviteRulesVO rules();
    /** 邀请记录 */
    Page<InviteRecordVO> records(Long userId, int page, int size, String status);
    /** 记录分享/扫码来源 */
    InviteSourceTraceVO shareLog(PromotionSourceTrace trace);
    /** 绑定邀请关系 */
    InviteBindVO bind(Long userId, String traceNo, String inviteCode, String qrCode);
    /** 被邀请人资料完善后推进邀请关系 */
    PromotionInviteRelation markProfileCompleted(Long inviteeId);
    /** 被邀请人三项认证完成后推进邀请关系 */
    PromotionInviteRelation markVerifySuccess(Long inviteeId);
    /** 获取普通用户二维码 */
    InviteQrCodeVO qrCode(Long userId);
    /** 查询代理来源 */
    InviteQrSourceVO qrSource(String qrCode);
}
