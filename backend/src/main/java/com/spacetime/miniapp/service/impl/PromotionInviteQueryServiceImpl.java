package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.ContentArticleDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.ContentArticle;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.common.enums.PromotionRewardStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.*;
import com.spacetime.miniapp.dto.response.*;
import com.spacetime.miniapp.service.PromotionInviteQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 小程序普通邀请只读应用服务实现。
 */
@Service
@RequiredArgsConstructor
public class PromotionInviteQueryServiceImpl implements PromotionInviteQueryService {
    private static final Set<String> RECORD_STATUSES = Set.of("all", "pending", "success", "failed");
    private final PromotionAttributionService attributionService;
    private final PromotionRuleDomainService ruleService;
    private final PromotionInviteRelationDao relationDao;
    private final PromotionRewardLogDao rewardDao;
    private final AppUserDao appUserDao;
    private final AppUserAuditContentService auditContentService;
    private final ContentArticleDao contentArticleDao;
    private final PromotionHtmlSanitizer htmlSanitizer;
    private final PromotionShareLinkBuilder shareLinkBuilder;

    @Override
    public InviteSourceTraceVO createSourceTrace(String sourceType, String sourceToken, String visitorKey) {
        com.spacetime.common.entity.PromotionSourceTrace trace =
                attributionService.createAnonymousTrace(sourceType, sourceToken, visitorKey);
        InviteSourceTraceVO vo = new InviteSourceTraceVO();
        vo.setTraceNo(trace.getTraceNo());
        vo.setSourceType(trace.getSourceType());
        return vo;
    }

    @Override
    public InviteHomeVO home(Long userId) {
        PromotionRuleSnapshot rule = ruleService.current("normal_user");
        List<PromotionInviteRelation> relations = allRelations(userId);
        Map<Long, AppUser> users = loadInvitees(relations);
        Map<Long, String> avatars = auditContentService.ownerAvatars(users.keySet());
        Map<Long, List<PromotionRewardLog>> rewards = loadRewards(relations);
        int successCount = relations.size();
        InviteHomeVO vo = new InviteHomeVO();
        vo.setRegisterReward(rule == null ? BigDecimal.ZERO : rule.events().stream()
                .filter(item -> PromotionRewardEventEnum.REGISTER_REWARD.getCode().equals(item.eventType())
                        && item.enabled())
                .map(PromotionRuleEventSnapshot::amount).findFirst().orElse(BigDecimal.ZERO));
        vo.setSuccessCount(successCount);
        vo.setPaidRewardTotal(rewards.values().stream().flatMap(Collection::stream)
                .filter(item -> PromotionRewardStatusEnum.SUCCESS.getCode().equals(item.getStatus()))
                .map(PromotionRewardLog::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add));
        List<InviteHomeVO.LadderItem> ladders = rule == null ? List.of() : rule.tiers().stream()
                .filter(PromotionRuleTierSnapshot::enabled)
                .map(item -> {
                    InviteHomeVO.LadderItem row = new InviteHomeVO.LadderItem();
                    row.setThreshold(item.threshold());
                    row.setRewardAmount(item.amount());
                    row.setAchieved(successCount >= item.threshold());
                    return row;
                }).toList();
        vo.setLadders(ladders);
        vo.setProgressCurrent(successCount);
        vo.setProgressMax(ladders.stream().map(InviteHomeVO.LadderItem::getThreshold)
                .max(Integer::compareTo).orElse(Math.max(successCount, 1)));
        vo.setRecentRecords(relations.stream()
                .sorted(Comparator.comparing(PromotionInviteRelation::getRegisteredAt).reversed())
                .limit(3)
                .map(item -> toRecent(item, users.get(item.getInviteeId()),
                        avatars.get(item.getInviteeId()),
                        rewards.getOrDefault(item.getId(), List.of())))
                .toList());
        com.spacetime.common.entity.PromotionSourceTrace shareTrace =
                attributionService.createNormalTrace(userId);
        String query = "sourceType=normal_user&sourceToken=" + shareTrace.getTraceNo();
        InviteHomeVO.ShareContext share = new InviteHomeVO.ShareContext();
        share.setTitle("邀请好友注册，解锁更多奖励");
        share.setPath("pages/promotion/invite-home?" + query);
        share.setLink(shareLinkBuilder.build(query));
        share.setQuery(Map.of("sourceType", "normal_user", "sourceToken", shareTrace.getTraceNo()));
        share.setSourceType("normal_user");
        share.setSourceToken(shareTrace.getTraceNo());
        vo.setShareContext(share);
        return vo;
    }

    @Override
    public Page<InviteRecordVO> records(Long userId, int page, int size, String status) {
        if (!RECORD_STATUSES.contains(status)) {
            throw new BusinessException("邀请记录状态不支持");
        }
        List<PromotionInviteRelation> relations = allRelations(userId);
        Map<Long, AppUser> users = loadInvitees(relations);
        Map<Long, String> avatars = auditContentService.ownerAvatars(users.keySet());
        Map<Long, List<PromotionRewardLog>> rewards = loadRewards(relations);
        List<InviteRecordVO> rows = relations.stream()
                .map(item -> toRecord(item, users.get(item.getInviteeId()),
                        avatars.get(item.getInviteeId()),
                        rewards.getOrDefault(item.getId(), List.of())))
                .filter(item -> "all".equals(status) || status.equals(item.getRewardStatus()))
                .sorted(Comparator.comparing(InviteRecordVO::getRegisteredAt).reversed())
                .toList();
        int from = Math.min(rows.size(), (page - 1) * size);
        int to = Math.min(rows.size(), from + size);
        Page<InviteRecordVO> result = new Page<>(page, size, rows.size());
        result.setRecords(rows.subList(from, to));
        return result;
    }

    @Override
    public InviteRulesVO rules() {
        PromotionRuleSnapshot rule = ruleService.current("normal_user");
        InviteRulesVO vo = new InviteRulesVO();
        vo.setSuccessDefinition("新用户完成注册并建立唯一邀请关系即为成功邀请");
        vo.setRelationValidity("邀请关系永久有效，建立后不可覆盖");
        if (rule == null) {
            vo.setEventRules(List.of());
            vo.setTiers(List.of());
            vo.setUpdatedAt(null);
            return vo;
        }
        vo.setEventRules(rule.events().stream().map(item -> {
            InviteRulesVO.EventRule row = new InviteRulesVO.EventRule();
            row.setEventType(item.eventType());
            row.setEventLabel(item.eventLabel());
            row.setEnabled(item.enabled());
            row.setAmount(item.amount());
            return row;
        }).toList());
        vo.setTiers(rule.tiers().stream().filter(PromotionRuleTierSnapshot::enabled).map(item -> {
            InviteRulesVO.TierRule row = new InviteRulesVO.TierRule();
            row.setThreshold(item.threshold());
            row.setAmount(item.amount());
            return row;
        }).toList());
        vo.setUpdatedAt(rule.publishedAt());
        return vo;
    }

    @Override
    public InviteRulesH5VO rulesH5() {
        ContentArticle article = contentArticleDao.selectByContentCode("invite_rules");
        InviteRulesH5VO vo = new InviteRulesH5VO();
        boolean enabled = article != null
                && CommonStatusEnum.ENABLED.getCode().equals(article.getStatus())
                && (article.getEffectiveTime() == null || !article.getEffectiveTime().isAfter(LocalDateTime.now()))
                && (article.getExpireTime() == null || article.getExpireTime().isAfter(LocalDateTime.now()));
        vo.setEnabled(enabled);
        if (article == null) {
            return vo;
        }
        vo.setTitle(article.getTitle());
        vo.setVersion(article.getVersion());
        vo.setUpdatedAt(article.getUpdateTime());
        vo.setUrl(article.getContentUrl());
        vo.setHtmlSnapshot(enabled ? htmlSanitizer.sanitize(article.getContentBody()) : null);
        return vo;
    }

    private List<PromotionInviteRelation> allRelations(Long userId) {
        Page<PromotionInviteRelation> page = relationDao.selectPage(
                new Page<>(1, 10000, false),
                new LambdaQueryWrapper<PromotionInviteRelation>()
                        .eq(PromotionInviteRelation::getSourceType, "normal_user")
                        .eq(PromotionInviteRelation::getInviterId, userId)
                        .orderByDesc(PromotionInviteRelation::getRegisteredAt));
        return page.getRecords();
    }

    private Map<Long, AppUser> loadInvitees(Collection<PromotionInviteRelation> relations) {
        List<Long> ids = relations.stream().map(PromotionInviteRelation::getInviteeId)
                .filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return Map.of();
        return appUserDao.selectList(new LambdaQueryWrapper<AppUser>().in(AppUser::getId, ids)).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity()));
    }

    private Map<Long, List<PromotionRewardLog>> loadRewards(Collection<PromotionInviteRelation> relations) {
        List<Long> ids = relations.stream().map(PromotionInviteRelation::getId).toList();
        if (ids.isEmpty()) return Map.of();
        Page<PromotionRewardLog> page = rewardDao.selectPage(
                new Page<>(1, 10000, false),
                new LambdaQueryWrapper<PromotionRewardLog>()
                        .in(PromotionRewardLog::getRelationId, ids)
                        .orderByAsc(PromotionRewardLog::getCreateTime));
        return page.getRecords().stream().collect(Collectors.groupingBy(PromotionRewardLog::getRelationId));
    }

    private InviteHomeVO.RecentRecord toRecent(PromotionInviteRelation relation,
                                               AppUser invitee,
                                               String avatarUrl,
                                               List<PromotionRewardLog> rewards) {
        InviteHomeVO.RecentRecord row = new InviteHomeVO.RecentRecord();
        row.setRelationNo(relation.getRelationNo());
        row.setInvitee(toInvitee(invitee, relation.getInviteeId(), avatarUrl));
        row.setRegisteredAt(relation.getRegisteredAt());
        PromotionRewardLog register = rewards.stream()
                .filter(item -> PromotionRewardEventEnum.REGISTER_REWARD.getCode().equals(item.getEventType()))
                .findFirst().orElse(null);
        row.setRewardAmount(register == null ? BigDecimal.ZERO : register.getAmount());
        row.setRewardStatus(register == null ? "pending" : register.getStatus());
        return row;
    }

    private InviteRecordVO toRecord(PromotionInviteRelation relation,
                                    AppUser invitee,
                                    String avatarUrl,
                                    List<PromotionRewardLog> rewards) {
        InviteRecordVO vo = new InviteRecordVO();
        vo.setRelationNo(relation.getRelationNo());
        vo.setInvitee(toInvitee(invitee, relation.getInviteeId(), avatarUrl));
        vo.setRegisteredAt(relation.getRegisteredAt());
        vo.setPaidTotal(rewards.stream()
                .filter(item -> PromotionRewardStatusEnum.SUCCESS.getCode().equals(item.getStatus()))
                .map(PromotionRewardLog::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add));
        vo.setRewardStatus(aggregateStatus(rewards));
        vo.setRewardItems(rewards.stream().map(item -> {
            InviteRecordVO.RewardItem row = new InviteRecordVO.RewardItem();
            row.setRewardNo(item.getRewardNo());
            row.setEventType(item.getEventType());
            row.setEventLabel(item.getEventLabelSnapshot());
            row.setLadderThreshold(item.getLadderThreshold());
            row.setAmount(item.getAmount());
            row.setStatus(item.getStatus());
            row.setCreatedAt(item.getCreateTime());
            row.setPaidAt(item.getSuccessTime());
            row.setFailureReason(item.getFailureReason());
            return row;
        }).toList());
        return vo;
    }

    private InviteHomeVO.Invitee toInvitee(AppUser user, Long id, String avatarUrl) {
        InviteHomeVO.Invitee vo = new InviteHomeVO.Invitee();
        vo.setUserNo(user != null && user.getAnonymousNo() != null
                ? user.getAnonymousNo() : "U" + String.format("%06d", id));
        vo.setNickname(user == null || user.getNickname() == null ? "未设置昵称" : user.getNickname());
        vo.setAvatarUrl(user == null ? null : avatarUrl);
        vo.setMobileMasked(mask(user == null ? null : user.getPhone()));
        return vo;
    }

    private String aggregateStatus(List<PromotionRewardLog> rewards) {
        if (rewards.stream().anyMatch(item -> "failed".equals(item.getStatus()))) return "failed";
        if (rewards.isEmpty() || rewards.stream().anyMatch(item -> "pending".equals(item.getStatus()))) return "pending";
        return "success";
    }

    private String mask(String phone) {
        if (phone == null || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

}
