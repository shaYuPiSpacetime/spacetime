package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionSourceTrace;

import java.util.Map;

/**
 * 小程序邀请推广服务接口
 */
public interface PromotionInviteService {
    /** 邀请首页 */
    Map<String, Object> home(Long userId);
    /** 活动规则 */
    Map<String, Object> rules();
    /** 邀请记录 */
    Page<PromotionInviteRelation> records(Long userId, int page, int size, String status);
    /** 记录分享/扫码来源 */
    PromotionSourceTrace shareLog(PromotionSourceTrace trace);
    /** 绑定邀请关系 */
    PromotionInviteRelation bind(Long userId, String traceNo, String inviteCode, String agentCode);
    /** 获取海报 */
    Map<String, Object> poster(Long userId);
    /** 查询代理来源 */
    Map<String, Object> agentSource(String agentCode);
}
