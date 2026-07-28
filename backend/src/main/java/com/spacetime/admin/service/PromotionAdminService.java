package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionAgentPageReq;
import com.spacetime.admin.dto.request.PromotionAgentSaveReq;
import com.spacetime.admin.dto.request.PromotionInvitePageReq;
import com.spacetime.admin.dto.request.PromotionRewardPageReq;
import com.spacetime.admin.dto.request.PromotionRulePublishReq;
import com.spacetime.admin.dto.request.PromotionSettlementPageReq;
import com.spacetime.admin.dto.response.PromotionAgentItemVO;
import com.spacetime.admin.dto.response.PromotionAgentQrCodeVO;
import com.spacetime.admin.dto.response.PromotionRelationItemVO;
import com.spacetime.admin.dto.response.PromotionRewardItemVO;
import com.spacetime.admin.dto.response.PromotionRuleConfigVO;
import com.spacetime.admin.dto.response.PromotionSettlementItemVO;
import com.spacetime.admin.dto.response.PromotionExportDownload;
import com.spacetime.admin.dto.response.PromotionExportTaskVO;

/**
 * PRD-07 后台五页应用服务。
 */
public interface PromotionAdminService {
    PromotionRuleConfigVO currentRule(String sourceType);
    PromotionRuleConfigVO publishRule(PromotionRulePublishReq req);
    Page<PromotionRelationItemVO> relations(PromotionInvitePageReq req);
    PromotionRelationItemVO relationDetail(String relationNo);
    Page<PromotionRewardItemVO> rewards(PromotionRewardPageReq req);
    PromotionRewardItemVO retryReward(String rewardNo);
    Page<PromotionAgentItemVO> agents(PromotionAgentPageReq req);
    PromotionAgentItemVO createAgent(PromotionAgentSaveReq req);
    PromotionAgentItemVO updateAgent(String agentNo, PromotionAgentSaveReq req);
    PromotionAgentItemVO updateAgentStatus(String agentNo, String status);
    PromotionAgentItemVO agentDetail(String agentNo);
    PromotionAgentQrCodeVO getOrCreateAgentQrCode(String agentNo);
    byte[] agentQrCodePng(String agentNo);
    Page<PromotionSettlementItemVO> settlements(PromotionSettlementPageReq req);
    PromotionSettlementItemVO confirmSettlement(String settlementNo);
    PromotionExportTaskVO exportRelations(PromotionInvitePageReq req);
    PromotionExportTaskVO exportRewards(PromotionRewardPageReq req);
    PromotionExportTaskVO exportAgents(PromotionAgentPageReq req);
    PromotionExportTaskVO exportSettlements(PromotionSettlementPageReq req);
    PromotionExportTaskVO exportTask(String taskNo);
    PromotionExportDownload downloadExport(String taskNo);
    void executeExportTask(String taskNo);
}
