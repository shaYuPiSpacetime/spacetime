package com.spacetime.miniapp.service;

import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentQrCodeDao;
import com.spacetime.common.dao.PromotionAgentSettlementDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentQrCode;
import com.spacetime.common.entity.PromotionAgentSettlement;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionSourceTrace;
import com.spacetime.common.entity.SysUser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 开发环境推广邀请关系造数。
 *
 * 默认不执行，避免普通单测误写数据库。
 */
@SpringBootTest
@EnabledIfSystemProperty(named = "seed.promotion.invite", matches = "true")
class PromotionInviteSeedDataTest {
    private static final long USER_INVITER_ID = 910000L;
    private static final long USER_INVITEE_BASE = 910100L;
    private static final long AGENT_INVITEE_BASE = 910200L;

    @Autowired
    private PromotionInviteService promotionInviteService;
    @Autowired
    private PromotionInviteEventService promotionInviteEventService;
    @Autowired
    private PromotionAgentDao agentDao;
    @Autowired
    private PromotionAgentQrCodeDao qrCodeDao;
    @Autowired
    private PromotionAgentSettlementDao settlementDao;
    @Autowired
    private UserDao userDao;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("造数：邀请关系来源 * 状态")
    void seedPromotionInviteRelations() {
        ensurePromotionSchema();
        cleanupSeedData();
        seedUsers();

        PromotionAgent agent = createAgent();
        PromotionAgentQrCode qrCode = createAgentQrCode(agent.getId());
        seedSettlements(agent.getId());

        PromotionInviteRelation userRegistered = seedUserQr("TR_SEED_USER_REGISTERED", USER_INVITEE_BASE + 1, "registered");
        PromotionInviteRelation userProfile = seedUserQr("TR_SEED_USER_PROFILE", USER_INVITEE_BASE + 2, "profile_completed");
        PromotionInviteRelation userVerify = seedUserQr("TR_SEED_USER_VERIFY", USER_INVITEE_BASE + 3, "verify_success");

        seedAgentQr("TR_SEED_AGENT_REGISTERED", AGENT_INVITEE_BASE + 1, qrCode.getQrCode(), "registered");
        seedAgentQr("TR_SEED_AGENT_PROFILE", AGENT_INVITEE_BASE + 2, qrCode.getQrCode(), "profile_completed");
        seedAgentQr("TR_SEED_AGENT_VERIFY", AGENT_INVITEE_BASE + 3, qrCode.getQrCode(), "verify_success");
        seedRewardLogs(userRegistered, userProfile, userVerify);

        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM promotion_invite_relation
                WHERE invitee_id BETWEEN ? AND ?
                   OR invitee_id BETWEEN ? AND ?
                """, Integer.class, USER_INVITEE_BASE + 1, USER_INVITEE_BASE + 3, AGENT_INVITEE_BASE + 1, AGENT_INVITEE_BASE + 3);
        assertThat(count).isEqualTo(6);
    }

    private PromotionInviteRelation seedUserQr(String traceNo, Long inviteeId, String targetStatus) {
        PromotionSourceTrace trace = new PromotionSourceTrace();
        trace.setTraceNo(traceNo);
        trace.setSourceType("user_qr");
        trace.setInviterId(USER_INVITER_ID);
        trace.setScene("seed-user-qr");
        promotionInviteService.shareLog(trace);

        PromotionInviteRelation relation = promotionInviteService.bind(inviteeId, traceNo, null, null);
        advanceStatus(inviteeId, targetStatus);
        assertThat(relation.getSourceType()).isEqualTo("user_qr");
        return relation;
    }

    private void seedAgentQr(String traceNo, Long inviteeId, String qrCode, String targetStatus) {
        PromotionSourceTrace trace = new PromotionSourceTrace();
        trace.setTraceNo(traceNo);
        trace.setSourceType("agent_qr");
        trace.setQrCode(qrCode);
        trace.setScene("seed-agent-qr");
        promotionInviteService.shareLog(trace);

        PromotionInviteRelation relation = promotionInviteService.bind(inviteeId, traceNo, null, qrCode);
        advanceStatus(inviteeId, targetStatus);
        assertThat(relation.getSourceType()).isEqualTo("agent_qr");
    }

    private void advanceStatus(Long inviteeId, String targetStatus) {
        if ("profile_completed".equals(targetStatus)) {
            promotionInviteService.markProfileCompleted(inviteeId);
        }
        if ("verify_success".equals(targetStatus)) {
            promotionInviteService.markVerifySuccess(inviteeId);
        }
    }

    private void seedRewardLogs(PromotionInviteRelation registered,
                                PromotionInviteRelation profileCompleted,
                                PromotionInviteRelation verifySuccess) {
        promotionInviteEventService.handleInviteEvent(registered.getInviteeId(), "register_login_reward");

        promotionInviteEventService.handleInviteEvent(profileCompleted.getInviteeId(), "register_login_reward");
        promotionInviteEventService.handleInviteEvent(profileCompleted.getInviteeId(), "profile_complete_reward");

        promotionInviteEventService.handleInviteEvent(verifySuccess.getInviteeId(), "register_login_reward");
        promotionInviteEventService.handleInviteEvent(verifySuccess.getInviteeId(), "profile_complete_reward");
        promotionInviteEventService.handleInviteEvent(verifySuccess.getInviteeId(), "verify_complete_reward");
        jdbcTemplate.update("UPDATE promotion_reward_log SET status = 'frozen', risk_reason = 'seed_review' WHERE invitee_id IN (?, ?, ?) AND event_type IN ('register_login_reward', 'profile_complete_reward', 'verify_complete_reward')",
                registered.getInviteeId(), profileCompleted.getInviteeId(), verifySuccess.getInviteeId());
    }

    private PromotionAgent createAgent() {
        PromotionAgent agent = new PromotionAgent();
        agent.setAgentName("种子校园代理-邀请关系");
        agent.setContactName("推广造数");
        agent.setContactPhone("13800000000");
        agent.setSchool("时空大学");
        agent.setCampus("测试校区");
        agent.setAgentGroup("SEED");
        agent.setStatus("normal");
        agent.setRemark("seed:promotion-invite");
        agentDao.insert(agent);
        return agent;
    }

    private void seedSettlements(Long agentId) {
        createSettlement(agentId, "ST_SEED_PENDING", "pending", new BigDecimal("120.00"), BigDecimal.ZERO, "待确认结算单");
        createSettlement(agentId, "ST_SEED_CONFIRMED", "confirmed", new BigDecimal("180.00"), BigDecimal.ZERO, "已确认待发放结算单");
        createSettlement(agentId, "ST_SEED_PAID", "paid", new BigDecimal("240.00"), new BigDecimal("240.00"), "已发放结算单");
    }

    private void createSettlement(Long agentId, String settlementNo, String status, BigDecimal payableAmount, BigDecimal paidAmount, String statsDesc) {
        PromotionAgentSettlement settlement = new PromotionAgentSettlement();
        settlement.setSettlementNo(settlementNo);
        settlement.setAgentId(agentId);
        settlement.setPeriodStart(LocalDate.of(2026, 5, 1));
        settlement.setPeriodEnd(LocalDate.of(2026, 5, 31));
        settlement.setStatsDesc(statsDesc);
        settlement.setPayableAmount(payableAmount);
        settlement.setPaidAmount(paidAmount);
        settlement.setStatus(status);
        if ("confirmed".equals(status) || "paid".equals(status)) {
            settlement.setConfirmTime(LocalDateTime.now());
        }
        if ("paid".equals(status)) {
            settlement.setPaidTime(LocalDateTime.now());
        }
        settlement.setRemark("seed:settlement");
        settlementDao.insert(settlement);
    }

    private void seedUsers() {
        createUser(USER_INVITER_ID, "seed_inviter", "种子邀请人");
        createUser(USER_INVITEE_BASE + 1, "seed_user_registered", "普通已注册");
        createUser(USER_INVITEE_BASE + 2, "seed_user_profile", "普通已完善资料");
        createUser(USER_INVITEE_BASE + 3, "seed_user_verify", "普通已认证");
        createUser(AGENT_INVITEE_BASE + 1, "seed_agent_registered", "代理已注册");
        createUser(AGENT_INVITEE_BASE + 2, "seed_agent_profile", "代理已完善资料");
        createUser(AGENT_INVITEE_BASE + 3, "seed_agent_verify", "代理已认证");
    }

    private void createUser(Long id, String username, String nickname) {
        SysUser user = new SysUser();
        user.setId(id);
        user.setUsername(username);
        user.setNickname(nickname);
        user.setPassword("{noop}seed");
        user.setPhone(String.valueOf(13800000000L + id % 100000));
        user.setStatus("ENABLE");
        userDao.insert(user);
    }

    private PromotionAgentQrCode createAgentQrCode(Long agentId) {
        PromotionAgentQrCode qrCode = new PromotionAgentQrCode();
        qrCode.setAgentId(agentId);
        qrCode.setQrCode("QR_SEED_AGENT_INVITE");
        qrCode.setMiniappPath("/pages/index/index?qrCode=QR_SEED_AGENT_INVITE");
        qrCode.setQrUrl(null);
        qrCode.setMaterialUrl(null);
        qrCode.setVersionNo(1);
        qrCode.setStatus("enabled");
        qrCodeDao.insert(qrCode);
        return qrCode;
    }

    private void ensurePromotionSchema() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS promotion_agent_qr_code (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    agent_id BIGINT NOT NULL COMMENT '代理ID',
                    qr_code VARCHAR(64) NOT NULL COMMENT '校园代理二维码编号',
                    miniapp_path VARCHAR(255) NOT NULL COMMENT '小程序路径',
                    qr_url VARCHAR(500) DEFAULT NULL COMMENT '二维码OSS地址',
                    material_url VARCHAR(500) DEFAULT NULL COMMENT '二维码素材OSS地址',
                    version_no INT DEFAULT 1 COMMENT '版本号',
                    status VARCHAR(20) DEFAULT 'enabled' COMMENT 'enabled/disabled',
                    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by BIGINT DEFAULT NULL,
                    updated_by BIGINT DEFAULT NULL,
                    deleted TINYINT DEFAULT 0,
                    UNIQUE KEY uk_qr_code (qr_code),
                    INDEX idx_agent_status (agent_id, status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校园代理二维码表'
                """);
        addColumnIfMissing("promotion_source_trace", "qr_code",
                "ALTER TABLE promotion_source_trace ADD COLUMN qr_code VARCHAR(64) DEFAULT NULL COMMENT '校园代理二维码编号'");
        addColumnIfMissing("promotion_invite_relation", "qr_code",
                "ALTER TABLE promotion_invite_relation ADD COLUMN qr_code VARCHAR(64) DEFAULT NULL COMMENT '校园代理二维码编号'");
        addColumnIfMissing("promotion_agent_event", "qr_code",
                "ALTER TABLE promotion_agent_event ADD COLUMN qr_code VARCHAR(64) DEFAULT NULL COMMENT '校园代理二维码编号'");
        modifyColumnNullableIfExists("promotion_agent_event", "agent_code",
                "ALTER TABLE promotion_agent_event MODIFY COLUMN agent_code VARCHAR(64) NULL");
    }

    private void modifyColumnNullableIfExists(String tableName, String columnName, String alterSql) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = ?
                  AND column_name = ?
                """, Integer.class, tableName, columnName);
        if (count != null && count > 0) {
            jdbcTemplate.execute(alterSql);
        }
    }

    private void addColumnIfMissing(String tableName, String columnName, String alterSql) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = ?
                  AND column_name = ?
                """, Integer.class, tableName, columnName);
        if (count == null || count == 0) {
            jdbcTemplate.execute(alterSql);
        }
    }

    private void cleanupSeedData() {
        List<Long> inviteeIds = List.of(
                USER_INVITEE_BASE + 1,
                USER_INVITEE_BASE + 2,
                USER_INVITEE_BASE + 3,
                AGENT_INVITEE_BASE + 1,
                AGENT_INVITEE_BASE + 2,
                AGENT_INVITEE_BASE + 3
        );
        String inviteePlaceholders = String.join(",", inviteeIds.stream().map(id -> "?").toList());
        jdbcTemplate.update("DELETE FROM promotion_agent_event WHERE user_id IN (" + inviteePlaceholders + ")", inviteeIds.toArray());
        jdbcTemplate.update("DELETE FROM promotion_reward_log WHERE invitee_id IN (" + inviteePlaceholders + ")", inviteeIds.toArray());
        jdbcTemplate.update("DELETE FROM promotion_invite_relation WHERE invitee_id IN (" + inviteePlaceholders + ")", inviteeIds.toArray());
        jdbcTemplate.update("DELETE FROM promotion_source_trace WHERE trace_no LIKE 'TR_SEED_%'");
        jdbcTemplate.update("DELETE FROM promotion_agent_qr_code WHERE qr_code LIKE 'QR_SEED_%'");
        jdbcTemplate.update("DELETE FROM promotion_agent_settlement WHERE settlement_no LIKE 'ST_SEED_%'");
        jdbcTemplate.update("DELETE FROM promotion_agent WHERE agent_name LIKE '种子校园代理-%'");
        jdbcTemplate.update("""
                DELETE FROM sys_user
                WHERE id = ?
                   OR id BETWEEN ? AND ?
                   OR id BETWEEN ? AND ?
                """, USER_INVITER_ID, USER_INVITEE_BASE + 1, USER_INVITEE_BASE + 3, AGENT_INVITEE_BASE + 1, AGENT_INVITEE_BASE + 3);
    }
}
