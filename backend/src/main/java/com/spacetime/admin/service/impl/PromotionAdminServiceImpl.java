package com.spacetime.admin.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.*;
import com.spacetime.admin.service.PromotionAdminService;
import com.spacetime.admin.event.PromotionExportRequestedEvent;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.enums.PromotionAgentStatusEnum;
import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.common.enums.PromotionRewardStatusEnum;
import com.spacetime.common.enums.PromotionSettlementStatusEnum;
import com.spacetime.common.enums.PromotionSourceTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.exception.ForbiddenException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.model.promotion.PromotionRuleDraft;
import com.spacetime.common.model.promotion.PromotionRuleEventDraft;
import com.spacetime.common.model.promotion.PromotionRuleTierDraft;
import com.spacetime.common.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * PRD-07 后台五页应用服务实现。
 */
@Service
@RequiredArgsConstructor
public class PromotionAdminServiceImpl implements PromotionAdminService {
    private final PromotionRuleDomainService ruleService;
    private final PromotionInviteRelationDao relationDao;
    private final PromotionRewardLogDao rewardDao;
    private final PromotionAgentBonusLogDao bonusDao;
    private final PromotionAgentDao agentDao;
    private final PromotionAgentStatDao statDao;
    private final PromotionAgentSettlementDao settlementDao;
    private final PromotionAgentQrCodeDao qrCodeDao;
    private final AppUserDao appUserDao;
    private final UserDao userDao;
    private final PromotionSettlementDomainService settlementService;
    private final PromotionRewardRetryCoordinator rewardRetryCoordinator;
    private final PromotionExportTaskDao exportTaskDao;
    private final PromotionAuditLogDao auditLogDao;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public PromotionRuleConfigVO currentRule(String sourceType) {
        requireSourceType(sourceType);
        PromotionRuleSnapshot snapshot = ruleService.current(sourceType);
        return snapshot == null ? defaultRule(sourceType) : toRuleVO(snapshot);
    }

    @Override
    @Transactional
    public PromotionRuleConfigVO publishRule(PromotionRulePublishReq req) {
        requirePermission(PromotionSourceTypeEnum.isNormalUser(req.getSourceType())
                ? "promotion:rule:normal:publish" : "promotion:rule:agent:publish");
        PromotionRuleSnapshot before = ruleService.current(req.getSourceType());
        PromotionRuleDraft draft = new PromotionRuleDraft(
                req.getSourceType(),
                req.getRewardMode(),
                req.getExpectedVersion(),
                req.getEvents().stream().map(item -> new PromotionRuleEventDraft(
                        item.getEventType(), Boolean.TRUE.equals(item.getEnabled()), item.getAmount())).toList(),
                req.getTiers() == null ? List.of() : req.getTiers().stream()
                        .map(item -> new PromotionRuleTierDraft(
                                item.getThreshold(), item.getAmount(), Boolean.TRUE.equals(item.getEnabled())))
                        .toList());
        PromotionRuleSnapshot published = ruleService.publish(draft);
        audit("rule", published.ruleId(), "publish_rule",
                before == null ? null : toJson(toRuleVO(before)),
                toJson(toRuleVO(published)), "发布推广规则快照");
        return toRuleVO(published);
    }

    @Override
    public Page<PromotionRelationItemVO> relations(PromotionInvitePageReq req) {
        validateRelationQuery(req);
        LambdaQueryWrapper<PromotionInviteRelation> wrapper = new LambdaQueryWrapper<PromotionInviteRelation>()
                .eq(StrUtil.isNotBlank(req.getRelationNo()), PromotionInviteRelation::getRelationNo, req.getRelationNo())
                .eq(StrUtil.isNotBlank(req.getSourceType()), PromotionInviteRelation::getSourceType, req.getSourceType())
                .ge(req.getRegisteredStartTime() != null, PromotionInviteRelation::getRegisteredAt, req.getRegisteredStartTime())
                .le(req.getRegisteredEndTime() != null, PromotionInviteRelation::getRegisteredAt, req.getRegisteredEndTime())
                .orderByDesc(PromotionInviteRelation::getRegisteredAt);
        Page<PromotionInviteRelation> source = relationDao.selectPage(new Page<>(1, 10000, false), wrapper);
        Map<Long, AppUser> users = loadUsers(source.getRecords());
        Map<Long, PromotionAgent> agents = loadAgents(source.getRecords().stream()
                .map(PromotionInviteRelation::getAgentId).toList());
        Map<Long, List<PromotionRewardItemVO>> rewards = loadRewardItemsByRelations(source.getRecords(), users, agents);
        List<PromotionRelationItemVO> mappedRelations = source.getRecords().stream()
                .map(item -> toRelationVO(item, users, agents, rewards.getOrDefault(item.getId(), List.of()), false))
                .filter(item -> matches(req.getSourceKeyword(), item.getSourceObjectNo(), item.getSourceObjectName(), item.getSourceObjectMobileMasked()))
                .filter(item -> matches(req.getInviteeKeyword(), item.getInviteeUserNo(), item.getInviteeNickname(), item.getInviteeMobileMasked()))
                .toList();
        return slice(mappedRelations, req.getPage(), req.getSize());
    }

    @Override
    public PromotionRelationItemVO relationDetail(String relationNo) {
        PromotionInviteRelation relation = relationDao.selectByRelationNo(relationNo);
        if (relation == null) {
            throw new BusinessException(404, "邀请关系不存在");
        }
        List<PromotionInviteRelation> one = List.of(relation);
        Map<Long, AppUser> users = loadUsers(one);
        Map<Long, PromotionAgent> agents = loadAgents(List.of(relation.getAgentId()));
        Map<Long, List<PromotionRewardItemVO>> rewards = loadRewardItemsByRelations(one, users, agents);
        return toRelationVO(relation, users, agents, rewards.getOrDefault(relation.getId(), List.of()), true);
    }

    @Override
    public Page<PromotionRewardItemVO> rewards(PromotionRewardPageReq req) {
        validateRewardQuery(req);
        List<PromotionRewardItemVO> rows = allRewardRows();
        rows = rows.stream()
                .filter(item -> StrUtil.isBlank(req.getSourceType()) || req.getSourceType().equals(item.getSourceType()))
                .filter(item -> StrUtil.isBlank(req.getRewardNo()) || req.getRewardNo().equals(item.getRewardNo()))
                .filter(item -> StrUtil.isBlank(req.getStatus()) || req.getStatus().equals(item.getStatus()))
                .filter(item -> StrUtil.isBlank(req.getEventType()) || req.getEventType().equals(item.getEventType()))
                .filter(item -> req.getLadderThreshold() == null || req.getLadderThreshold().equals(item.getLadderThreshold()))
                .filter(item -> matches(req.getRewardObjectKeyword(), item.getRewardObjectNo(), item.getRewardObjectName(), item.getRewardObjectMobileMasked()))
                .filter(item -> matches(req.getInviteeKeyword(), item.getInviteeUserNo(), item.getInviteeNickname()))
                .filter(item -> req.getCreatedStartTime() == null || !item.getCreatedAt().isBefore(req.getCreatedStartTime()))
                .filter(item -> req.getCreatedEndTime() == null || !item.getCreatedAt().isAfter(req.getCreatedEndTime()))
                .sorted(Comparator.comparing(PromotionRewardItemVO::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        return slice(rows, req.getPage(), req.getSize());
    }

    @Override
    public PromotionRewardItemVO retryReward(String rewardNo) {
        PromotionRewardLog reward = rewardDao.selectByRewardNo(rewardNo);
        if (reward == null) {
            throw new BusinessException(404, "奖励流水不存在");
        }
        if (!PromotionRewardStatusEnum.FAILED.getCode().equals(reward.getStatus())) {
            throw new BusinessException(409, "仅发放失败的普通邀请奖励可重试");
        }
        rewardRetryCoordinator.retryOrThrow(reward.getId(), currentUserId());
        return allRewardRows().stream()
                .filter(item -> rewardNo.equals(item.getRewardNo()))
                .findFirst().orElseThrow(() -> new BusinessException(404, "奖励流水不存在"));
    }

    @Override
    public Page<PromotionAgentItemVO> agents(PromotionAgentPageReq req) {
        if (StrUtil.isNotBlank(req.getStatus()) && !PromotionAgentStatusEnum.supports(req.getStatus())) {
            throw new BusinessException("校园推广员状态只支持 enabled/disabled");
        }
        return queryAgents(req, hasPermission("promotion:agent:sensitive"));
    }

    private Page<PromotionAgentItemVO> queryAgents(PromotionAgentPageReq req, boolean includeSensitive) {
        LambdaQueryWrapper<PromotionAgent> wrapper = new LambdaQueryWrapper<PromotionAgent>()
                .eq(StrUtil.isNotBlank(req.getAgentNo()), PromotionAgent::getAgentNo, req.getAgentNo())
                .eq(StrUtil.isNotBlank(req.getSchool()), PromotionAgent::getSchool, req.getSchool())
                .eq(StrUtil.isNotBlank(req.getCampus()), PromotionAgent::getCampus, req.getCampus())
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionAgent::getStatus, req.getStatus())
                .and(StrUtil.isNotBlank(req.getKeyword()), nested -> nested
                        .like(PromotionAgent::getAgentName, req.getKeyword())
                        .or().like(PromotionAgent::getCampus, req.getKeyword())
                        .or().like(PromotionAgent::getSchool, req.getKeyword()))
                .orderByDesc(PromotionAgent::getCreateTime);
        Page<PromotionAgent> source = agentDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<PromotionAgentItemVO> result = pageLike(source);
        result.setRecords(source.getRecords().stream()
                .map(item -> toAgentVO(item, false, includeSensitive)).toList());
        return result;
    }

    @Override
    @Transactional
    public PromotionAgentItemVO createAgent(PromotionAgentSaveReq req) {
        PromotionAgent agent = new PromotionAgent();
        agent.setAgentNo("AGT-" + IdUtil.getSnowflakeNextIdStr());
        applyAgent(agent, req);
        agent.setStatus(PromotionAgentStatusEnum.ENABLED.getCode());
        agentDao.insert(agent);
        audit("agent", agent.getId(), "create_agent", null, agentAuditJson(agent), "新增校园推广员");
        return toAgentVO(agent, false, hasPermission("promotion:agent:sensitive"));
    }

    @Override
    @Transactional
    public PromotionAgentItemVO updateAgent(String agentNo, PromotionAgentSaveReq req) {
        PromotionAgent agent = requireAgent(agentNo);
        String before = agentAuditJson(agent);
        applyAgent(agent, req);
        agentDao.updateById(agent);
        audit("agent", agent.getId(), "update_agent", before, agentAuditJson(agent), "编辑校园推广员");
        return toAgentVO(agent, false, hasPermission("promotion:agent:sensitive"));
    }

    @Override
    @Transactional
    public PromotionAgentItemVO updateAgentStatus(String agentNo, String status) {
        if (!PromotionAgentStatusEnum.supports(status)) {
            throw new BusinessException("校园推广员状态只支持 enabled/disabled");
        }
        PromotionAgent agent = requireAgent(agentNo);
        String before = agentAuditJson(agent);
        agent.setStatus(status);
        agentDao.updateById(agent);
        audit("agent", agent.getId(), "update_agent_status",
                before, agentAuditJson(agent), "启停校园推广员");
        return toAgentVO(agent, false, hasPermission("promotion:agent:sensitive"));
    }

    @Override
    public PromotionAgentItemVO agentDetail(String agentNo) {
        return toAgentVO(requireAgent(agentNo), true, hasPermission("promotion:agent:sensitive"));
    }

    @Override
    @Transactional
    public PromotionAgentQrCodeVO getOrCreateAgentQrCode(String agentNo) {
        PromotionAgent agent = requireAgent(agentNo);
        PromotionAgentQrCode qr = qrCodeDao.selectByAgentId(agent.getId());
        if (qr == null) {
            qr = new PromotionAgentQrCode();
            qr.setAgentId(agent.getId());
            qr.setQrToken(IdUtil.fastSimpleUUID());
            qr.setMiniappPath("pages/promotion/invite-home?sourceType=campus_agent&sourceToken=" + qr.getQrToken());
            qr.setImageUrl("/admin/promotion/agents/" + agentNo + "/qr-code/image");
            try {
                qrCodeDao.insert(qr);
            } catch (DuplicateKeyException ex) {
                qr = qrCodeDao.selectByAgentId(agent.getId());
                if (qr == null) {
                    throw ex;
                }
            }
        }
        audit("agent", agent.getId(), "generate_qr_code", null,
                "{\"agentNo\":\"" + agent.getAgentNo() + "\",\"generated\":true}",
                "生成或复用校园推广员二维码，未记录二维码令牌");
        return toQrVO(agent, qr);
    }

    @Override
    public byte[] agentQrCodePng(String agentNo) {
        PromotionAgent agent = requireAgent(agentNo);
        PromotionAgentQrCode qr = qrCodeDao.selectByAgentId(agent.getId());
        if (qr == null) {
            throw new BusinessException(404, "校园推广员二维码尚未生成");
        }
        try {
            BitMatrix matrix = new QRCodeWriter().encode(qr.getMiniappPath(), BarcodeFormat.QR_CODE, 512, 512);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return output.toByteArray();
        } catch (Exception ex) {
            throw new BusinessException(70006, "二维码生成失败，请重试");
        }
    }

    @Override
    public Page<PromotionSettlementItemVO> settlements(PromotionSettlementPageReq req) {
        if (StrUtil.isNotBlank(req.getStatus()) && !PromotionSettlementStatusEnum.supports(req.getStatus())) {
            throw new BusinessException("结算单状态只支持 pending_confirm/confirmed");
        }
        LambdaQueryWrapper<PromotionAgentSettlement> wrapper = new LambdaQueryWrapper<PromotionAgentSettlement>()
                .eq(StrUtil.isNotBlank(req.getSettlementNo()), PromotionAgentSettlement::getSettlementNo, req.getSettlementNo())
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionAgentSettlement::getStatus, req.getStatus())
                .orderByDesc(PromotionAgentSettlement::getSettlementMonth);
        if (StrUtil.isNotBlank(req.getPeriodMonth())) {
            try {
                wrapper.eq(PromotionAgentSettlement::getSettlementMonth,
                        YearMonth.parse(req.getPeriodMonth()).atDay(1));
            } catch (Exception ex) {
                throw new BusinessException("结算月份格式必须为 yyyy-MM");
            }
        }
        Page<PromotionAgentSettlement> source = settlementDao.selectPage(new Page<>(1, 10000, false), wrapper);
        Map<Long, PromotionAgent> agents = loadAgents(source.getRecords().stream()
                .map(PromotionAgentSettlement::getAgentId).toList());
        List<PromotionSettlementItemVO> rows = source.getRecords().stream()
                .map(item -> toSettlementVO(item, agents.get(item.getAgentId())))
                .filter(item -> matches(req.getAgentKeyword(), item.getAgentNo(), item.getAgentName(), item.getSchool(), item.getCampus()))
                .toList();
        return slice(rows, req.getPage(), req.getSize());
    }

    @Override
    @Transactional
    public PromotionSettlementItemVO confirmSettlement(String settlementNo) {
        PromotionAgentSettlement before = settlementDao.selectBySettlementNo(settlementNo);
        PromotionAgentSettlement settlement = settlementService.confirm(settlementNo, currentUserId());
        audit("settlement", settlement.getId(), "confirm_settlement",
                settlementAuditJson(before), settlementAuditJson(settlement), "确认校园推广员月度结算");
        return toSettlementVO(settlement, agentDao.selectById(settlement.getAgentId()));
    }

    @Override
    @Transactional
    public PromotionExportTaskVO exportRelations(PromotionInvitePageReq req) {
        validateRelationQuery(req);
        return createExportTask("relations", req, false);
    }

    @Override
    @Transactional
    public PromotionExportTaskVO exportRewards(PromotionRewardPageReq req) {
        validateRewardQuery(req);
        return createExportTask("rewards", req, false);
    }

    @Override
    @Transactional
    public PromotionExportTaskVO exportAgents(PromotionAgentPageReq req) {
        if (StrUtil.isNotBlank(req.getStatus()) && !PromotionAgentStatusEnum.supports(req.getStatus())) {
            throw new BusinessException("校园推广员状态只支持 enabled/disabled");
        }
        return createExportTask("agents", req, hasPermission("promotion:agent:sensitive"));
    }

    @Override
    @Transactional
    public PromotionExportTaskVO exportSettlements(PromotionSettlementPageReq req) {
        if (StrUtil.isNotBlank(req.getStatus()) && !PromotionSettlementStatusEnum.supports(req.getStatus())) {
            throw new BusinessException("结算单状态只支持 pending_confirm/confirmed");
        }
        return createExportTask("settlements", req, false);
    }

    @Override
    public PromotionExportTaskVO exportTask(String taskNo) {
        PromotionExportTask task = requireExportTask(taskNo);
        requireExportTaskAccess(task);
        return toExportTaskVO(task);
    }

    @Override
    public PromotionExportDownload downloadExport(String taskNo) {
        PromotionExportTask task = requireExportTask(taskNo);
        requireExportTaskAccess(task);
        if (!"success".equals(task.getStatus()) || StrUtil.isBlank(task.getFileUrl())) {
            throw new BusinessException(409, "导出文件尚未生成");
        }
        try {
            Path exportRoot = exportRoot();
            Path file = Path.of(task.getFileUrl()).toAbsolutePath().normalize();
            if (!file.startsWith(exportRoot) || !Files.isRegularFile(file)) {
                throw new BusinessException(404, "导出文件不存在或已过期");
            }
            return new PromotionExportDownload(task.getFileName(), Files.readAllBytes(file));
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(70006, "导出文件读取失败");
        }
    }

    private PromotionExportTaskVO createExportTask(String pageType, Object request, boolean includeSensitive) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.set("request", objectMapper.valueToTree(request));
        payload.put("includeSensitive", includeSensitive);
        PromotionExportTask task = new PromotionExportTask();
        task.setTaskNo("EXP-" + IdUtil.getSnowflakeNextIdStr());
        task.setPageType(pageType);
        task.setFilterJson(payload.toString());
        task.setStatus("pending");
        exportTaskDao.insert(task);
        audit("export_task", task.getId(), "export_requested_" + pageType, null,
                "{\"taskNo\":\"" + task.getTaskNo() + "\",\"status\":\"pending\"}",
                "筛选条件已记录在导出任务");
        eventPublisher.publishEvent(new PromotionExportRequestedEvent(task.getTaskNo()));
        return toExportTaskVO(task);
    }

    @Override
    public void executeExportTask(String taskNo) {
        PromotionExportTask task = requireExportTask(taskNo);
        if (!"pending".equals(task.getStatus())) {
            return;
        }
        task.setStatus("processing");
        exportTaskDao.updateById(task);
        try {
            JsonNode payload = objectMapper.readTree(task.getFilterJson());
            boolean includeSensitive = payload.path("includeSensitive").asBoolean(false);
            List<String> csvLines = buildExportCsv(task.getPageType(), payload.path("request"), includeSensitive);
            Path root = exportRoot();
            Files.createDirectories(root);
            String fileName = "promotion-" + task.getPageType() + "-" + task.getTaskNo() + ".csv";
            Path target = root.resolve(fileName).normalize();
            byte[] body = ("\uFEFF" + String.join("\r\n", csvLines) + "\r\n")
                    .getBytes(StandardCharsets.UTF_8);
            Files.write(target, body);
            task.setStatus("success");
            task.setFileName(fileName);
            task.setFileUrl(target.toString());
            task.setRowCount(Math.max(0, csvLines.size() - 1));
            task.setFinishedAt(LocalDateTime.now());
            exportTaskDao.updateById(task);
            auditAs(task.getCreatedBy(), "export_task", task.getId(), "export_completed_" + task.getPageType(), null,
                    "{\"taskNo\":\"" + task.getTaskNo() + "\",\"rowCount\":" + task.getRowCount() + "}",
                    "筛选条件已记录在导出任务");
        } catch (Exception ex) {
            task.setStatus("failed");
            task.setFailureReason("导出文件生成失败");
            task.setFinishedAt(LocalDateTime.now());
            exportTaskDao.updateById(task);
        }
    }

    private List<String> buildExportCsv(String pageType, JsonNode request, boolean includeSensitive)
            throws Exception {
        return switch (pageType) {
            case "relations" -> relationExportCsv(objectMapper.treeToValue(request, PromotionInvitePageReq.class));
            case "rewards" -> rewardExportCsv(objectMapper.treeToValue(request, PromotionRewardPageReq.class));
            case "agents" -> agentExportCsv(
                    objectMapper.treeToValue(request, PromotionAgentPageReq.class), includeSensitive);
            case "settlements" -> settlementExportCsv(
                    objectMapper.treeToValue(request, PromotionSettlementPageReq.class));
            default -> throw new BusinessException("导出任务页面类型无效");
        };
    }

    private List<String> relationExportCsv(PromotionInvitePageReq req) {
        req.setPage(1);
        req.setSize(10000);
        List<PromotionRelationItemVO> rows = relations(req).getRecords();
        List<String> csv = new ArrayList<>();
        csv.add(csvRow("关系编号", "来源类型", "来源对象编号", "来源对象名称", "被邀请用户编号",
                "被邀请用户昵称", "注册时间", "已发奖励合计"));
        rows.forEach(item -> csv.add(csvRow(item.getRelationNo(), item.getSourceType(),
                item.getSourceObjectNo(), item.getSourceObjectName(), item.getInviteeUserNo(),
                item.getInviteeNickname(), item.getRegisteredAt(), item.getPaidRewardTotal())));
        return csv;
    }

    private List<String> rewardExportCsv(PromotionRewardPageReq req) {
        req.setPage(1);
        req.setSize(10000);
        List<PromotionRewardItemVO> rows = rewards(req).getRecords();
        List<String> csv = new ArrayList<>();
        csv.add(csvRow("奖励流水号", "来源类型", "奖励对象编号", "奖励对象名称", "被邀请用户编号",
                "被邀请用户昵称", "奖励事件", "奖励金额", "单位", "状态", "生成时间", "到账时间"));
        rows.forEach(item -> csv.add(csvRow(item.getRewardNo(), item.getSourceType(),
                item.getRewardObjectNo(), item.getRewardObjectName(), item.getInviteeUserNo(),
                item.getInviteeNickname(), rewardEventExportLabel(item), item.getAmount(), item.getAmountUnit(),
                rewardStatusLabel(item.getStatus()), item.getCreatedAt(), item.getPaidAt())));
        return csv;
    }

    private List<String> agentExportCsv(PromotionAgentPageReq req, boolean includeSensitive) {
        req.setPage(1);
        req.setSize(10000);
        List<PromotionAgentItemVO> rows = queryAgents(req, includeSensitive).getRecords();
        List<String> csv = new ArrayList<>();
        csv.add(csvRow("推广员编号", "推广员名称", "学校", "校区", "联系人", "联系电话",
                "状态", "扫码点击数", "注册数", "待结算奖励", "已确认奖励", "创建时间"));
        rows.forEach(item -> csv.add(csvRow(item.getAgentNo(), item.getAgentName(), item.getSchool(),
                item.getCampus(), item.getContactName(),
                includeSensitive ? item.getContactPhone() : item.getContactPhoneMasked(),
                agentStatusLabel(item.getStatus()), item.getScanClickCount(), item.getRegisterCount(),
                item.getPendingBonus(), item.getPaidBonus(), item.getCreatedAt())));
        return csv;
    }

    private List<String> settlementExportCsv(PromotionSettlementPageReq req) {
        req.setPage(1);
        req.setSize(10000);
        List<PromotionSettlementItemVO> rows = settlements(req).getRecords();
        List<String> csv = new ArrayList<>();
        csv.add(csvRow("结算单号", "周期开始", "周期结束", "推广员编号", "推广员名称",
                "学校", "校区", "应结金额", "状态", "生成时间", "确认时间", "确认人"));
        rows.forEach(item -> csv.add(csvRow(item.getSettlementNo(), item.getPeriodStart(), item.getPeriodEnd(),
                item.getAgentNo(), item.getAgentName(), item.getSchool(), item.getCampus(), item.getAmount(),
                settlementStatusLabel(item.getStatus()), item.getGeneratedAt(), item.getConfirmedAt(),
                item.getConfirmedByName())));
        return csv;
    }

    private List<PromotionRewardItemVO> allRewardRows() {
        Page<PromotionRewardLog> normal = rewardDao.selectPage(
                new Page<>(1, 10000, false),
                new LambdaQueryWrapper<PromotionRewardLog>().orderByDesc(PromotionRewardLog::getCreateTime));
        Page<PromotionAgentBonusLog> agentBonus = bonusDao.selectPage(
                new Page<>(1, 10000, false),
                new LambdaQueryWrapper<PromotionAgentBonusLog>().orderByDesc(PromotionAgentBonusLog::getOccurredAt));
        Set<Long> relationIds = new HashSet<>();
        normal.getRecords().forEach(item -> relationIds.add(item.getRelationId()));
        agentBonus.getRecords().forEach(item -> relationIds.add(item.getRelationId()));
        Map<Long, PromotionInviteRelation> relations = loadRelations(relationIds);
        Map<Long, AppUser> users = loadUsers(relations.values());
        Map<Long, PromotionAgent> agents = loadAgents(relations.values().stream()
                .map(PromotionInviteRelation::getAgentId).toList());
        List<PromotionRewardItemVO> rows = new ArrayList<>();
        normal.getRecords().forEach(item -> rows.add(toRewardVO(
                item, relations.get(item.getRelationId()), users, agents)));
        agentBonus.getRecords().forEach(item -> rows.add(toBonusVO(
                item, relations.get(item.getRelationId()), users, agents)));
        return rows;
    }

    private Map<Long, List<PromotionRewardItemVO>> loadRewardItemsByRelations(
            Collection<PromotionInviteRelation> relations,
            Map<Long, AppUser> users,
            Map<Long, PromotionAgent> agents) {
        if (relations.isEmpty()) {
            return Map.of();
        }
        Set<Long> ids = relations.stream().map(PromotionInviteRelation::getId).collect(Collectors.toSet());
        Map<Long, PromotionInviteRelation> relationMap = relations.stream()
                .collect(Collectors.toMap(PromotionInviteRelation::getId, Function.identity()));
        Page<PromotionRewardLog> normal = rewardDao.selectPage(
                new Page<>(1, 10000, false),
                new LambdaQueryWrapper<PromotionRewardLog>().in(PromotionRewardLog::getRelationId, ids)
                        .orderByAsc(PromotionRewardLog::getCreateTime));
        Page<PromotionAgentBonusLog> bonuses = bonusDao.selectPage(
                new Page<>(1, 10000, false),
                new LambdaQueryWrapper<PromotionAgentBonusLog>().in(PromotionAgentBonusLog::getRelationId, ids)
                        .orderByAsc(PromotionAgentBonusLog::getOccurredAt));
        Map<Long, List<PromotionRewardItemVO>> result = new HashMap<>();
        normal.getRecords().forEach(item -> result.computeIfAbsent(item.getRelationId(), ignored -> new ArrayList<>())
                .add(toRewardVO(item, relationMap.get(item.getRelationId()), users, agents)));
        bonuses.getRecords().forEach(item -> result.computeIfAbsent(item.getRelationId(), ignored -> new ArrayList<>())
                .add(toBonusVO(item, relationMap.get(item.getRelationId()), users, agents)));
        return result;
    }

    private PromotionRelationItemVO toRelationVO(PromotionInviteRelation relation,
                                                 Map<Long, AppUser> users,
                                                 Map<Long, PromotionAgent> agents,
                                                 List<PromotionRewardItemVO> rewardItems,
                                                 boolean detail) {
        PromotionRelationItemVO vo = new PromotionRelationItemVO();
        vo.setRelationNo(relation.getRelationNo());
        vo.setSourceType(relation.getSourceType());
        AppUser invitee = users.get(relation.getInviteeId());
        vo.setInviteeUserNo(userNo(invitee, relation.getInviteeId()));
        vo.setInviteeNickname(name(invitee));
        vo.setInviteeMobileMasked(mask(invitee == null ? null : invitee.getPhone()));
        if (PromotionSourceTypeEnum.isNormalUser(relation.getSourceType())) {
            AppUser inviter = users.get(relation.getInviterId());
            vo.setSourceObjectNo(userNo(inviter, relation.getInviterId()));
            vo.setSourceObjectName(name(inviter));
            vo.setSourceObjectMobileMasked(mask(inviter == null ? null : inviter.getPhone()));
        } else {
            PromotionAgent agent = agents.get(relation.getAgentId());
            vo.setSourceObjectNo(agent == null ? null : agent.getAgentNo());
            vo.setSourceObjectName(agent == null ? null : agent.getAgentName());
            vo.setSourceObjectMobileMasked(mask(agent == null ? null : agent.getContactPhone()));
        }
        vo.setRegisteredAt(relation.getRegisteredAt());
        vo.setPaidRewardTotal(rewardItems.stream()
                .filter(item -> PromotionRewardStatusEnum.SUCCESS.getCode().equals(item.getStatus()))
                .map(PromotionRewardItemVO::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        vo.setRewardItems(detail ? rewardItems : null);
        return vo;
    }

    private PromotionRewardItemVO toRewardVO(PromotionRewardLog item,
                                             PromotionInviteRelation relation,
                                             Map<Long, AppUser> users,
                                             Map<Long, PromotionAgent> agents) {
        PromotionRewardItemVO vo = baseRewardVO(relation, users, agents);
        vo.setRewardNo(item.getRewardNo());
        vo.setEventType(item.getEventType());
        vo.setEventLabel(item.getEventLabelSnapshot());
        vo.setLadderThreshold(item.getLadderThreshold());
        vo.setAmount(item.getAmount());
        vo.setAmountUnit("coin");
        vo.setStatus(item.getStatus());
        vo.setRuleVersion(item.getRuleVersion());
        vo.setRetryCount(item.getRetryCount());
        vo.setFailureReason(item.getFailureReason());
        vo.setCreatedAt(item.getCreateTime());
        vo.setPaidAt(item.getSuccessTime());
        return vo;
    }

    private PromotionRewardItemVO toBonusVO(PromotionAgentBonusLog item,
                                            PromotionInviteRelation relation,
                                            Map<Long, AppUser> users,
                                            Map<Long, PromotionAgent> agents) {
        PromotionRewardItemVO vo = baseRewardVO(relation, users, agents);
        vo.setRewardNo(item.getBonusNo());
        vo.setEventType(item.getEventType());
        vo.setEventLabel(item.getEventLabelSnapshot());
        vo.setLadderThreshold(item.getLadderThreshold());
        vo.setAmount(item.getAmount());
        vo.setAmountUnit("cny");
        vo.setStatus(PromotionRewardStatusEnum.SUCCESS.getCode());
        vo.setRuleVersion(item.getRuleVersion());
        vo.setRetryCount(0);
        vo.setCreatedAt(item.getOccurredAt());
        vo.setPaidAt(item.getOccurredAt());
        return vo;
    }

    private PromotionRewardItemVO baseRewardVO(PromotionInviteRelation relation,
                                               Map<Long, AppUser> users,
                                               Map<Long, PromotionAgent> agents) {
        PromotionRewardItemVO vo = new PromotionRewardItemVO();
        if (relation == null) {
            return vo;
        }
        vo.setRelationNo(relation.getRelationNo());
        vo.setSourceType(relation.getSourceType());
        AppUser invitee = users.get(relation.getInviteeId());
        vo.setInviteeUserNo(userNo(invitee, relation.getInviteeId()));
        vo.setInviteeNickname(name(invitee));
        if (PromotionSourceTypeEnum.isNormalUser(relation.getSourceType())) {
            AppUser inviter = users.get(relation.getInviterId());
            vo.setRewardObjectNo(userNo(inviter, relation.getInviterId()));
            vo.setRewardObjectName(name(inviter));
            vo.setRewardObjectMobileMasked(mask(inviter == null ? null : inviter.getPhone()));
        } else {
            PromotionAgent agent = agents.get(relation.getAgentId());
            vo.setRewardObjectNo(agent == null ? null : agent.getAgentNo());
            vo.setRewardObjectName(agent == null ? null : agent.getAgentName());
            vo.setRewardObjectMobileMasked(mask(agent == null ? null : agent.getContactPhone()));
        }
        return vo;
    }

    private PromotionAgentItemVO toAgentVO(PromotionAgent agent, boolean detail, boolean includeSensitive) {
        PromotionAgentStat stat = statDao.selectByAgentId(agent.getId());
        PromotionAgentItemVO vo = new PromotionAgentItemVO();
        vo.setAgentNo(agent.getAgentNo());
        vo.setAgentName(agent.getAgentName());
        vo.setSchool(agent.getSchool());
        vo.setCampus(agent.getCampus());
        vo.setContactName(agent.getContactName());
        vo.setContactPhoneMasked(mask(agent.getContactPhone()));
        vo.setContactPhone(includeSensitive ? agent.getContactPhone() : null);
        vo.setStatus(agent.getStatus());
        vo.setRemark(agent.getRemark());
        vo.setScanClickCount(stat == null || stat.getClickCnt() == null ? 0 : stat.getClickCnt());
        vo.setRegisterCount(stat == null || stat.getSuccessInviteCount() == null ? 0 : stat.getSuccessInviteCount());
        vo.setPayableBonus(stat == null ? BigDecimal.ZERO : zero(stat.getTotalBonusAmount()));
        vo.setPaidBonus(stat == null ? BigDecimal.ZERO : zero(stat.getConfirmedBonusAmount()));
        vo.setPendingBonus(stat == null ? BigDecimal.ZERO : zero(stat.getPendingBonusAmount()));
        vo.setCreatedAt(agent.getCreateTime());
        vo.setUpdatedAt(agent.getUpdateTime());
        if (detail) {
            Page<PromotionAgentBonusLog> bonusPage = bonusDao.selectPage(
                    new Page<>(1, 5, false),
                    new LambdaQueryWrapper<PromotionAgentBonusLog>()
                            .eq(PromotionAgentBonusLog::getAgentId, agent.getId())
                            .orderByDesc(PromotionAgentBonusLog::getOccurredAt));
            Map<Long, PromotionInviteRelation> relations = loadRelations(bonusPage.getRecords().stream()
                    .map(PromotionAgentBonusLog::getRelationId).collect(Collectors.toSet()));
            Map<Long, AppUser> users = loadUsers(relations.values());
            vo.setBonusRecords(bonusPage.getRecords().stream().map(item -> {
                PromotionAgentBonusRecordVO row = new PromotionAgentBonusRecordVO();
                row.setBonusNo(item.getBonusNo());
                row.setEventLabel(item.getEventLabelSnapshot());
                PromotionInviteRelation relation = relations.get(item.getRelationId());
                AppUser invitee = relation == null ? null : users.get(relation.getInviteeId());
                row.setInviteeDisplayName(name(invitee));
                row.setBonusAmount(item.getAmount());
                row.setOccurredAt(item.getOccurredAt());
                PromotionAgentSettlement settlement = item.getSettlementId() == null
                        ? null : settlementDao.selectById(item.getSettlementId());
                row.setSettlementNo(settlement == null ? null : settlement.getSettlementNo());
                return row;
            }).toList());
            Page<PromotionAgentSettlement> settlementPage = settlementDao.selectPage(
                    new Page<>(1, 5, false),
                    new LambdaQueryWrapper<PromotionAgentSettlement>()
                            .eq(PromotionAgentSettlement::getAgentId, agent.getId())
                            .orderByDesc(PromotionAgentSettlement::getSettlementMonth));
            vo.setSettlementRecords(settlementPage.getRecords().stream()
                    .map(item -> toSettlementVO(item, agent)).toList());
        }
        return vo;
    }

    private PromotionSettlementItemVO toSettlementVO(PromotionAgentSettlement entity, PromotionAgent agent) {
        PromotionSettlementItemVO vo = new PromotionSettlementItemVO();
        vo.setSettlementNo(entity.getSettlementNo());
        if (entity.getSettlementMonth() != null) {
            YearMonth month = YearMonth.from(entity.getSettlementMonth());
            vo.setPeriodStart(month.atDay(1));
            vo.setPeriodEnd(month.atEndOfMonth());
        }
        if (agent != null) {
            vo.setAgentNo(agent.getAgentNo());
            vo.setAgentName(agent.getAgentName());
            vo.setSchool(agent.getSchool());
            vo.setCampus(agent.getCampus());
        }
        vo.setAmount(entity.getPayableAmount());
        vo.setStatus(entity.getStatus());
        vo.setGeneratedAt(entity.getCreateTime());
        vo.setConfirmedAt(entity.getConfirmedTime());
        if (entity.getConfirmedBy() != null) {
            SysUser user = userDao.selectById(entity.getConfirmedBy());
            vo.setConfirmedByName(user == null ? String.valueOf(entity.getConfirmedBy()) : user.getNickname());
        }
        return vo;
    }

    private PromotionRuleConfigVO toRuleVO(PromotionRuleSnapshot snapshot) {
        PromotionRuleConfigVO vo = new PromotionRuleConfigVO();
        vo.setSourceType(snapshot.sourceType());
        vo.setRewardMode(snapshot.rewardMode());
        vo.setVersion(snapshot.version());
        vo.setPublishedAt(snapshot.publishedAt());
        vo.setEvents(snapshot.events().stream().map(this::toEventVO).toList());
        vo.setTiers(snapshot.tiers().stream().map(this::toTierVO).toList());
        return vo;
    }

    private PromotionRuleConfigVO defaultRule(String sourceType) {
        PromotionRuleConfigVO vo = new PromotionRuleConfigVO();
        vo.setSourceType(sourceType);
        vo.setRewardMode("fixed");
        vo.setVersion(0);
        vo.setPublishedAt(null);
        List<String> events = List.of(
                PromotionRewardEventEnum.REGISTER_REWARD.getCode(),
                PromotionRewardEventEnum.PROFILE_COMPLETE_REWARD.getCode(),
                PromotionRewardEventEnum.VERIFY_COMPLETE_REWARD.getCode(),
                PromotionRewardEventEnum.FIRST_VIP_REWARD.getCode(),
                PromotionRewardEventEnum.FIRST_COIN_RECHARGE_REWARD.getCode());
        vo.setEvents(events.stream().map(type -> {
            PromotionRuleConfigVO.EventItem item = new PromotionRuleConfigVO.EventItem();
            item.setEventType(type);
            item.setEventLabel(eventLabel(type));
            item.setEnabled(PromotionRewardEventEnum.REGISTER_REWARD.getCode().equals(type));
            item.setAmount(BigDecimal.ZERO);
            return item;
        }).toList());
        vo.setTiers(List.of());
        return vo;
    }

    private PromotionRuleConfigVO.EventItem toEventVO(PromotionRuleEventSnapshot snapshot) {
        PromotionRuleConfigVO.EventItem vo = new PromotionRuleConfigVO.EventItem();
        vo.setEventType(snapshot.eventType());
        vo.setEventLabel(snapshot.eventLabel());
        vo.setEnabled(snapshot.enabled());
        vo.setAmount(snapshot.amount());
        return vo;
    }

    private PromotionRuleConfigVO.TierItem toTierVO(PromotionRuleTierSnapshot snapshot) {
        PromotionRuleConfigVO.TierItem vo = new PromotionRuleConfigVO.TierItem();
        vo.setThreshold(snapshot.threshold());
        vo.setAmount(snapshot.amount());
        vo.setEnabled(snapshot.enabled());
        return vo;
    }

    private PromotionAgentQrCodeVO toQrVO(PromotionAgent agent, PromotionAgentQrCode qr) {
        PromotionAgentQrCodeVO vo = new PromotionAgentQrCodeVO();
        vo.setAgentNo(agent.getAgentNo());
        vo.setQrToken(qr.getQrToken());
        vo.setMiniappPath(qr.getMiniappPath());
        vo.setImageUrl(qr.getImageUrl());
        vo.setCreatedAt(qr.getCreateTime());
        return vo;
    }

    private void applyAgent(PromotionAgent agent, PromotionAgentSaveReq req) {
        agent.setAgentName(req.getAgentName().trim());
        agent.setSchool(req.getSchool().trim());
        agent.setCampus(req.getCampus().trim());
        agent.setContactName(StrUtil.trim(req.getContactName()));
        agent.setContactPhone(StrUtil.trim(req.getContactPhone()));
        agent.setRemark(StrUtil.trim(req.getRemark()));
    }

    private PromotionAgent requireAgent(String agentNo) {
        PromotionAgent agent = agentDao.selectByAgentNo(agentNo);
        if (agent == null) {
            throw new BusinessException(404, "校园推广员不存在");
        }
        return agent;
    }

    private Map<Long, AppUser> loadUsers(Collection<PromotionInviteRelation> relations) {
        Set<Long> ids = new HashSet<>();
        relations.forEach(item -> {
            if (item.getInviterId() != null) ids.add(item.getInviterId());
            if (item.getInviteeId() != null) ids.add(item.getInviteeId());
        });
        if (ids.isEmpty()) return Map.of();
        return appUserDao.selectList(new LambdaQueryWrapper<AppUser>().in(AppUser::getId, ids)).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity()));
    }

    private Map<Long, PromotionAgent> loadAgents(Collection<Long> ids) {
        List<Long> values = ids == null ? List.of() : ids.stream().filter(Objects::nonNull).distinct().toList();
        if (values.isEmpty()) return Map.of();
        Page<PromotionAgent> page = agentDao.selectPage(
                new Page<>(1, Math.min(10000, Math.max(1, values.size())), false),
                new LambdaQueryWrapper<PromotionAgent>().in(PromotionAgent::getId, values));
        return page.getRecords().stream().collect(Collectors.toMap(PromotionAgent::getId, Function.identity()));
    }

    private Map<Long, PromotionInviteRelation> loadRelations(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) return Map.of();
        Page<PromotionInviteRelation> page = relationDao.selectPage(
                new Page<>(1, Math.min(10000, Math.max(1, ids.size())), false),
                new LambdaQueryWrapper<PromotionInviteRelation>().in(PromotionInviteRelation::getId, ids));
        return page.getRecords().stream()
                .collect(Collectors.toMap(PromotionInviteRelation::getId, Function.identity()));
    }

    private <S, T> Page<T> pageLike(Page<S> source) {
        return new Page<>(source.getCurrent(), source.getSize(), source.getTotal());
    }

    private <T> Page<T> slice(List<T> rows, int page, int size) {
        int from = Math.min(rows.size(), (page - 1) * size);
        int to = Math.min(rows.size(), from + size);
        Page<T> result = new Page<>(page, size, rows.size());
        result.setRecords(rows.subList(from, to));
        return result;
    }

    private Long currentUserId() {
        UserContext context = UserContextHolder.get();
        if (context == null) throw new BusinessException(401, "未登录或登录已过期");
        return context.getId();
    }

    private void requirePermission(String permission) {
        if (!hasPermission(permission)) {
            throw new ForbiddenException("无权限");
        }
    }

    private boolean hasPermission(String permission) {
        UserContext context = UserContextHolder.get();
        if (context == null) {
            return false;
        }
        List<String> permissions = context.getPermissions();
        return permissions != null && permissions.contains(permission);
    }

    private void requireSourceType(String sourceType) {
        if (!PromotionSourceTypeEnum.supports(sourceType)) {
            throw new BusinessException("推广来源不支持");
        }
    }

    private PromotionExportTask requireExportTask(String taskNo) {
        PromotionExportTask task = exportTaskDao.selectByTaskNo(taskNo);
        if (task == null) {
            throw new BusinessException(404, "导出任务不存在");
        }
        return task;
    }

    private void requireExportTaskAccess(PromotionExportTask task) {
        requirePermission("promotion:" + exportPermissionSegment(task.getPageType()) + ":export");
        UserContext context = UserContextHolder.get();
        boolean superAdmin = context != null && context.getRoles() != null
                && context.getRoles().contains("super_admin");
        if (!superAdmin && !Objects.equals(task.getCreatedBy(), currentUserId())) {
            throw new ForbiddenException("只能访问本人创建的导出任务");
        }
    }

    private String exportPermissionSegment(String pageType) {
        return switch (pageType) {
            case "relations" -> "relation";
            case "rewards" -> "reward";
            case "agents" -> "agent";
            case "settlements" -> "settlement";
            default -> throw new BusinessException("导出任务页面类型无效");
        };
    }

    private PromotionExportTaskVO toExportTaskVO(PromotionExportTask task) {
        PromotionExportTaskVO vo = new PromotionExportTaskVO();
        vo.setTaskNo(task.getTaskNo());
        vo.setPageType(task.getPageType());
        vo.setStatus(task.getStatus());
        vo.setFileName(task.getFileName());
        vo.setDownloadUrl("success".equals(task.getStatus())
                ? "/admin/promotion/exports/" + task.getTaskNo() + "/download" : null);
        vo.setRowCount(task.getRowCount());
        vo.setFailureReason(task.getFailureReason());
        vo.setCreatedAt(task.getCreateTime());
        vo.setFinishedAt(task.getFinishedAt());
        return vo;
    }

    private Path exportRoot() {
        return Path.of(System.getProperty("java.io.tmpdir"), "spacetime-promotion-exports")
                .toAbsolutePath().normalize();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new BusinessException("导出筛选条件序列化失败");
        }
    }

    private void audit(String bizType, Long bizId, String action,
                       String beforeValue, String afterValue, String remark) {
        auditAs(currentUserId(), bizType, bizId, action, beforeValue, afterValue, remark);
    }

    private void auditAs(Long operatorId, String bizType, Long bizId, String action,
                         String beforeValue, String afterValue, String remark) {
        PromotionAuditLog log = new PromotionAuditLog();
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(beforeValue);
        log.setAfterValue(afterValue);
        log.setRemark(remark);
        log.setCreatedBy(operatorId);
        log.setUpdatedBy(operatorId);
        auditLogDao.insert(log);
    }

    private String agentAuditJson(PromotionAgent agent) {
        if (agent == null) {
            return null;
        }
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("agentNo", agent.getAgentNo());
        value.put("agentName", agent.getAgentName());
        value.put("school", agent.getSchool());
        value.put("campus", agent.getCampus());
        value.put("status", agent.getStatus());
        value.put("remark", agent.getRemark());
        return toJson(value);
    }

    private String rewardAuditJson(PromotionRewardLog reward) {
        if (reward == null) {
            return null;
        }
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("rewardNo", reward.getRewardNo());
        value.put("status", reward.getStatus());
        value.put("retryCount", reward.getRetryCount());
        value.put("eventType", reward.getEventType());
        value.put("amount", reward.getAmount());
        return toJson(value);
    }

    private String settlementAuditJson(PromotionAgentSettlement settlement) {
        if (settlement == null) {
            return null;
        }
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("settlementNo", settlement.getSettlementNo());
        value.put("status", settlement.getStatus());
        value.put("payableAmount", settlement.getPayableAmount());
        value.put("confirmedBy", settlement.getConfirmedBy());
        value.put("confirmedTime", settlement.getConfirmedTime());
        return toJson(value);
    }

    private String csvRow(Object... values) {
        return Arrays.stream(values).map(this::csvCell).collect(Collectors.joining(","));
    }

    private String csvCell(Object raw) {
        String value = raw == null ? "" : String.valueOf(raw);
        if (!value.isEmpty()) {
            char first = value.charAt(0);
            if (first == '=' || first == '+' || first == '-' || first == '@'
                    || first == '\t' || first == '\r') {
                value = "'" + value;
            }
        }
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private String rewardEventExportLabel(PromotionRewardItemVO item) {
        if (PromotionRewardEventEnum.LADDER_BONUS.getCode().equals(item.getEventType())
                && item.getLadderThreshold() != null) {
            return "阶梯奖励-累计" + item.getLadderThreshold() + "人";
        }
        return StrUtil.isBlank(item.getEventLabel()) ? eventLabel(item.getEventType()) : item.getEventLabel();
    }

    private String rewardStatusLabel(String status) {
        return switch (status) {
            case "pending" -> "待发放";
            case "success" -> "已发放";
            case "failed" -> "发放失败";
            default -> status;
        };
    }

    private String agentStatusLabel(String status) {
        return "enabled".equals(status) ? "启用" : "disabled".equals(status) ? "停用" : status;
    }

    private String settlementStatusLabel(String status) {
        return "pending_confirm".equals(status) ? "待确认"
                : "confirmed".equals(status) ? "已确认" : status;
    }

    private void validateRelationQuery(PromotionInvitePageReq req) {
        if (StrUtil.isNotBlank(req.getSourceType())) {
            requireSourceType(req.getSourceType());
        }
        if (req.getRegisteredStartTime() != null && req.getRegisteredEndTime() != null
                && req.getRegisteredStartTime().isAfter(req.getRegisteredEndTime())) {
            throw new BusinessException("注册开始时间不能晚于结束时间");
        }
    }

    private void validateRewardQuery(PromotionRewardPageReq req) {
        if (StrUtil.isNotBlank(req.getSourceType())) {
            requireSourceType(req.getSourceType());
        }
        if (StrUtil.isNotBlank(req.getStatus()) && !PromotionRewardStatusEnum.supports(req.getStatus())) {
            throw new BusinessException("奖励状态只支持 pending/success/failed");
        }
        if (StrUtil.isNotBlank(req.getEventType()) && !PromotionRewardEventEnum.supports(req.getEventType())) {
            throw new BusinessException("奖励事件不支持");
        }
        if (req.getLadderThreshold() != null && req.getLadderThreshold() <= 0) {
            throw new BusinessException("阶梯阈值必须大于0");
        }
        if (req.getCreatedStartTime() != null && req.getCreatedEndTime() != null
                && req.getCreatedStartTime().isAfter(req.getCreatedEndTime())) {
            throw new BusinessException("生成开始时间不能晚于结束时间");
        }
    }

    private String userNo(AppUser user, Long id) {
        if (user != null && StrUtil.isNotBlank(user.getAnonymousNo())) return user.getAnonymousNo();
        return id == null ? null : "U" + String.format("%06d", id);
    }

    private String name(AppUser user) {
        return user == null || StrUtil.isBlank(user.getNickname()) ? "未设置昵称" : user.getNickname();
    }

    private String mask(String phone) {
        if (phone == null || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private BigDecimal zero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String eventLabel(String type) {
        return switch (type) {
            case "register_reward" -> "完成注册";
            case "profile_complete_reward" -> "完善资料";
            case "verify_complete_reward" -> "完成认证";
            case "first_vip_reward" -> "首次开通会员";
            case "first_coin_recharge_reward" -> "首次充值千寻币";
            default -> type;
        };
    }

    private boolean matches(String keyword, String... values) {
        if (StrUtil.isBlank(keyword)) return true;
        String target = keyword.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values).filter(Objects::nonNull)
                .anyMatch(value -> value.toLowerCase(Locale.ROOT).contains(target));
    }
}
