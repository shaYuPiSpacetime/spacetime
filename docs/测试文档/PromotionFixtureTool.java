import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.Date;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.StringJoiner;

/**
 * Promotion module test fixture tool.
 *
 * Usage:
 *   javac -cp "$MYSQL_CONNECTOR_JAR" docs/测试文档/PromotionFixtureTool.java
 *   DB_HOST=... DB_USER=... DB_PASSWORD=... java -cp "docs/测试文档:$MYSQL_CONNECTOR_JAR" PromotionFixtureTool seed
 *
 * Actions:
 *   seed   create deterministic promotion fixtures and print TEST_* exports
 *   clean  delete only fixtures owned by this tool
 */
public class PromotionFixtureTool {
    private static final long USER_INVITER_ID = 910000L;
    private static final long USER_INVITEE_BASE = 910100L;
    private static final long AGENT_INVITEE_BASE = 910200L;
    private static final String AGENT_NAME = "种子校园代理-邀请关系";
    private static final String AGENT_NO = "AGT-L1-SEED";
    private static final String QR_CODE = "QR_SEED_AGENT_INVITE";

    public static void main(String[] args) throws Exception {
        String action = args.length == 0 ? "seed" : args[0];
        try (Connection conn = connect()) {
            conn.setAutoCommit(false);
            PromotionFixtureTool tool = new PromotionFixtureTool();
            try {
                if ("clean".equals(action)) {
                    tool.clean(conn);
                    conn.commit();
                    System.out.println("cleaned=true");
                    return;
                }
                if (!"seed".equals(action)) {
                    throw new IllegalArgumentException("Unsupported action: " + action);
                }
                Fixture fixture = tool.seed(conn);
                conn.commit();
                fixture.printExports();
            } catch (Exception e) {
                conn.rollback();
                throw e;
            }
        }
    }

    private static Connection connect() throws Exception {
        Class.forName("com.mysql.cj.jdbc.Driver");
        String host = env("DB_HOST", "127.0.0.1");
        String port = env("DB_PORT", "3306");
        String db = env("DB_NAME", "spacetime");
        String user = requiredEnv("DB_USER");
        String password = requiredEnv("DB_PASSWORD");
        String url = "jdbc:mysql://" + host + ":" + port + "/" + db
                + "?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai"
                + "&allowPublicKeyRetrieval=true&useSSL=false";
        return DriverManager.getConnection(url, user, password);
    }

    private static String env(String key, String fallback) {
        String value = System.getenv(key);
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String requiredEnv(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing env: " + key);
        }
        return value;
    }

    private Fixture seed(Connection conn) throws SQLException {
        clean(conn);
        ensureOptionalColumns(conn);
        seedUsers(conn);
        long agentId = createAgent(conn);
        createAgentStat(conn, agentId);
        long qrId = createQrCode(conn, agentId);
        Fixture fixture = new Fixture();
        fixture.agentQrCode = QR_CODE;
        fixture.materialId = qrId;
        fixture.agentId = agentId;
        fixture.frozenRelationId = createRelation(conn, "REL_SEED_FROZEN", "TR_SEED_FROZEN",
                USER_INVITEE_BASE + 1, "normal_user", USER_INVITER_ID, null, null, "frozen", "registered");
        fixture.invalidRelationId = createRelation(conn, "REL_SEED_INVALID", "TR_SEED_INVALID",
                USER_INVITEE_BASE + 2, "normal_user", USER_INVITER_ID, null, null, "registered", null);
        long frozenRewardApproveRelation = createRelation(conn, "REL_SEED_REWARD_APPROVE", "TR_SEED_REWARD_APPROVE",
                USER_INVITEE_BASE + 3, "normal_user", USER_INVITER_ID, null, null, "verify_success", null);
        long frozenRewardRejectRelation = createRelation(conn, "REL_SEED_REWARD_REJECT", "TR_SEED_REWARD_REJECT",
                USER_INVITEE_BASE + 4, "normal_user", USER_INVITER_ID, null, null, "verify_success", null);
        createRelation(conn, "REL_SEED_AGENT_QR", "TR_SEED_AGENT_QR",
                AGENT_INVITEE_BASE + 1, "campus_agent", null, agentId, QR_CODE, "registered", null);
        fixture.frozenRewardId = createReward(conn, "RW_SEED_APPROVE", frozenRewardApproveRelation,
                USER_INVITER_ID, USER_INVITEE_BASE + 3, "verify_complete_reward", "frozen");
        fixture.frozenRewardRejectId = createReward(conn, "RW_SEED_REJECT", frozenRewardRejectRelation,
                USER_INVITER_ID, USER_INVITEE_BASE + 4, "verify_complete_reward", "frozen");
        createReward(conn, "RW_SEED_SUCCESS", frozenRewardApproveRelation,
                USER_INVITER_ID, USER_INVITEE_BASE + 3, "register_login_reward", "success");
        fixture.unsettledSettlementId = createSettlement(conn, agentId, "ST_SEED_UNSETTLED", "unsettled",
                new BigDecimal("120.00"), BigDecimal.ZERO);
        fixture.confirmedSettlementId = createSettlement(conn, agentId, "ST_SEED_CONFIRMED", "confirmed",
                new BigDecimal("180.00"), BigDecimal.ZERO);
        fixture.paidSettlementId = createSettlement(conn, agentId, "ST_SEED_PAID", "paid",
                new BigDecimal("240.00"), new BigDecimal("240.00"));
        fixture.terminateAgentId = createAgent(conn, "AGT-L1-TERM", "种子校园代理-待终止", "normal");
        createAgentStat(conn, fixture.terminateAgentId);
        return fixture;
    }

    private void clean(Connection conn) throws SQLException {
        delete(conn, "promotion_agent_event", "user_id IN (?,?,?,?,?,?)", inviteeIds());
        delete(conn, "promotion_reward_log", "reward_no LIKE 'RW_SEED_%'", List.of());
        delete(conn, "promotion_reward_log", "invitee_id IN (?,?,?,?,?,?)", inviteeIds());
        delete(conn, "promotion_invite_relation", "relation_no LIKE 'REL_SEED_%'", List.of());
        delete(conn, "promotion_invite_relation", "invitee_id IN (?,?,?,?,?,?)", inviteeIds());
        delete(conn, "promotion_source_trace", "trace_no LIKE 'TR_SEED_%'", List.of());
        delete(conn, "promotion_agent_settlement", "settlement_no LIKE 'ST_SEED_%'", List.of());
        delete(conn, "promotion_agent_qr_code", "qr_code LIKE 'QR_SEED_%'", List.of());
        delete(conn, "promo_agent_stat", "agent_no LIKE 'AGT-L1-%'", List.of());
        delete(conn, "promotion_agent", "agent_no LIKE 'AGT-L1-%' OR agent_name LIKE '种子校园代理-%'", List.of());
        delete(conn, "sys_user", "id = ? OR id BETWEEN ? AND ? OR id BETWEEN ? AND ?",
                List.of(USER_INVITER_ID, USER_INVITEE_BASE + 1, USER_INVITEE_BASE + 4,
                        AGENT_INVITEE_BASE + 1, AGENT_INVITEE_BASE + 1));
    }

    private List<Object> inviteeIds() {
        return List.of(USER_INVITEE_BASE + 1, USER_INVITEE_BASE + 2, USER_INVITEE_BASE + 3,
                USER_INVITEE_BASE + 4, AGENT_INVITEE_BASE + 1, AGENT_INVITEE_BASE + 2);
    }

    private void delete(Connection conn, String table, String where, List<?> args) throws SQLException {
        if (!hasTable(conn, table)) {
            return;
        }
        try (PreparedStatement ps = conn.prepareStatement("DELETE FROM " + table + " WHERE " + where)) {
            bind(ps, args);
            ps.executeUpdate();
        }
    }

    private void ensureOptionalColumns(Connection conn) throws SQLException {
        addColumnIfMissing(conn, "promotion_agent", "agent_no",
                "ALTER TABLE promotion_agent ADD COLUMN agent_no VARCHAR(64) DEFAULT NULL");
        addColumnIfMissing(conn, "promotion_agent", "bonus_rule_group",
                "ALTER TABLE promotion_agent ADD COLUMN bonus_rule_group VARCHAR(64) DEFAULT NULL");
        addColumnIfMissing(conn, "promotion_source_trace", "qr_code",
                "ALTER TABLE promotion_source_trace ADD COLUMN qr_code VARCHAR(64) DEFAULT NULL");
        addColumnIfMissing(conn, "promotion_invite_relation", "qr_code",
                "ALTER TABLE promotion_invite_relation ADD COLUMN qr_code VARCHAR(64) DEFAULT NULL");
        addColumnIfMissing(conn, "promotion_invite_relation", "frozen_before_status",
                "ALTER TABLE promotion_invite_relation ADD COLUMN frozen_before_status VARCHAR(30) DEFAULT NULL");
        addColumnIfMissing(conn, "promotion_invite_relation", "invalid_reason",
                "ALTER TABLE promotion_invite_relation ADD COLUMN invalid_reason VARCHAR(100) DEFAULT NULL");
        if (!hasTable(conn, "promotion_agent_qr_code")) {
            try (Statement st = conn.createStatement()) {
                st.execute("""
                        CREATE TABLE promotion_agent_qr_code (
                          id BIGINT AUTO_INCREMENT PRIMARY KEY,
                          agent_id BIGINT NOT NULL,
                          qr_code VARCHAR(64) NOT NULL,
                          miniapp_path VARCHAR(255) NOT NULL,
                          qr_url VARCHAR(500) DEFAULT NULL,
                          material_url VARCHAR(500) DEFAULT NULL,
                          version_no INT DEFAULT 1,
                          status VARCHAR(20) DEFAULT 'enabled',
                          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                          created_by BIGINT DEFAULT NULL,
                          updated_by BIGINT DEFAULT NULL,
                          deleted TINYINT DEFAULT 0,
                          UNIQUE KEY uk_qr_code (qr_code)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                        """);
            }
        }
    }

    private void addColumnIfMissing(Connection conn, String table, String column, String ddl) throws SQLException {
        if (!hasTable(conn, table) || hasColumn(conn, table, column)) {
            return;
        }
        try (Statement st = conn.createStatement()) {
            st.execute(ddl);
        }
    }

    private void seedUsers(Connection conn) throws SQLException {
        createUser(conn, USER_INVITER_ID, "seed_inviter", "种子邀请人", "13800010000");
        createUser(conn, USER_INVITEE_BASE + 1, "seed_user_frozen", "普通冻结关系", "13800010101");
        createUser(conn, USER_INVITEE_BASE + 2, "seed_user_invalid", "普通待判无效", "13800010102");
        createUser(conn, USER_INVITEE_BASE + 3, "seed_user_reward_ok", "冻结奖励通过", "13800010103");
        createUser(conn, USER_INVITEE_BASE + 4, "seed_user_reward_reject", "冻结奖励驳回", "13800010104");
        createUser(conn, AGENT_INVITEE_BASE + 1, "seed_agent_registered", "代理已注册", "13800010201");
    }

    private void createUser(Connection conn, long id, String username, String nickname, String phone) throws SQLException {
        InsertData data = new InsertData(conn, "sys_user")
                .put("id", id)
                .put("username", username)
                .put("password", "{noop}seed")
                .put("nickname", nickname)
                .put("email", username + "@example.test")
                .put("phone", phone)
                .put("status", "ENABLE")
                .put("avatar", "")
                .audit();
        insert(conn, "sys_user", data.columns, data.values);
    }

    private long createAgent(Connection conn) throws SQLException {
        return createAgent(conn, AGENT_NO, AGENT_NAME, "normal");
    }

    private long createAgent(Connection conn, String agentNo, String agentName, String status) throws SQLException {
        List<String> cols = columns(conn, "promotion_agent",
                "agent_no", "agent_name", "contact_name", "contact_phone", "school", "campus",
                "agent_group", "bonus_rule_group", "status", "remark",
                "create_time", "update_time", "created_by", "updated_by", "deleted");
        List<Object> values = new ArrayList<>();
        for (String col : cols) {
            values.add(switch (col) {
                case "agent_no" -> agentNo;
                case "agent_name" -> agentName;
                case "contact_name" -> "推广造数";
                case "contact_phone" -> "13800000000";
                case "school" -> "时空大学";
                case "campus" -> "测试校区";
                case "agent_group", "bonus_rule_group" -> "L1_GROUP";
                case "status" -> status;
                case "remark" -> "seed:promotion-fixture-tool";
                case "create_time", "update_time" -> now();
                case "created_by", "updated_by" -> 1L;
                case "deleted" -> 0;
                default -> null;
            });
        }
        return insert(conn, "promotion_agent", cols, values);
    }

    private void createAgentStat(Connection conn, long agentId) throws SQLException {
        if (!hasTable(conn, "promo_agent_stat")) {
            return;
        }
        insert(conn, "promo_agent_stat", columns(conn, "promo_agent_stat",
                "agent_id", "agent_no", "click_cnt", "register_cnt", "profile_cnt", "verify_cnt", "success_cnt",
                "first_vip_cnt", "first_coin_recharge_cnt", "bonus_due_amount", "bonus_pending_amount",
                "bonus_confirmed_amount", "bonus_paid_amount", "stat_version", "remark",
                "create_time", "update_time", "created_by", "updated_by", "deleted"),
                List.of(agentId, AGENT_NO, 0, 0, 0, 0, 0, 0, 0,
                        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                        1, "seed:promotion-fixture-tool", now(), now(), 1L, 1L, 0));
    }

    private long createQrCode(Connection conn, long agentId) throws SQLException {
        return insert(conn, "promotion_agent_qr_code", columns(conn, "promotion_agent_qr_code",
                "agent_id", "qr_code", "miniapp_path", "qr_url", "material_url", "version_no", "status",
                "create_time", "update_time", "created_by", "updated_by", "deleted"),
                List.of(agentId, QR_CODE, "/pages/index/index?qrCode=" + QR_CODE, "", "", 1, "enabled",
                        now(), now(), 1L, 1L, 0));
    }

    private long createRelation(Connection conn, String relationNo, String traceNo, long inviteeId, String sourceType,
                                Long inviterId, Long agentId, String qrCode, String status,
                                String frozenBeforeStatus) throws SQLException {
        long traceId = insert(conn, "promotion_source_trace", columns(conn, "promotion_source_trace",
                "trace_no", "source_type", "inviter_id", "agent_id", "qr_code", "visitor_user_id",
                "invitee_user_id", "scene", "device_hash", "ip", "bind_status",
                "create_time", "update_time", "created_by", "updated_by", "deleted"),
                Arrays.asList(traceNo, sourceType, inviterId, agentId, qrCode, null, inviteeId, "seed",
                        "seed-device", "127.0.0.1", "bound", now(), now(), 1L, 1L, 0));
        return insert(conn, "promotion_invite_relation", columns(conn, "promotion_invite_relation",
                "relation_no", "source_trace_id", "source_type", "inviter_id", "invitee_id", "agent_id", "qr_code",
                "status", "bind_time", "first_click_time", "register_time", "first_login_time",
                "profile_complete_time", "verify_success_time", "frozen_before_status", "invalid_reason",
                "success_metric_hit_time", "total_reward_coin", "create_time", "update_time",
                "created_by", "updated_by", "deleted"),
                Arrays.asList(relationNo, traceId, sourceType, inviterId, inviteeId, agentId, qrCode,
                        status, now(), now(), now(), now(), now(), now(), frozenBeforeStatus, null,
                        now(), BigDecimal.ZERO, now(), now(), 1L, 1L, 0));
    }

    private long createReward(Connection conn, String rewardNo, long relationId, long inviterId, long inviteeId,
                              String eventType, String status) throws SQLException {
        return insert(conn, "promotion_reward_log", columns(conn, "promotion_reward_log",
                "reward_no", "relation_id", "inviter_id", "invitee_id", "event_type", "reward_coin",
                "status", "risk_reason", "coin_log_id", "arrive_time", "review_time", "reviewer_id",
                "review_remark", "create_time", "update_time", "created_by", "updated_by", "deleted"),
                Arrays.asList(rewardNo, relationId, inviterId, inviteeId, eventType, new BigDecimal("10.00"),
                        status, "seed_review", null, null, null, null, null, now(), now(), 1L, 1L, 0));
    }

    private long createSettlement(Connection conn, long agentId, String settlementNo, String status,
                                  BigDecimal payableAmount, BigDecimal paidAmount) throws SQLException {
        Timestamp confirmTime = ("confirmed".equals(status) || "paid".equals(status)) ? now() : null;
        Timestamp paidTime = "paid".equals(status) ? now() : null;
        return insert(conn, "promotion_agent_settlement", columns(conn, "promotion_agent_settlement",
                "settlement_no", "agent_id", "period_start", "period_end", "stats_desc", "payable_amount",
                "paid_amount", "status", "confirm_time", "paid_time", "operator_id", "remark",
                "create_time", "update_time", "created_by", "updated_by", "deleted"),
                Arrays.asList(settlementNo, agentId, Date.valueOf(LocalDate.of(2026, 5, 1)),
                        Date.valueOf(LocalDate.of(2026, 5, 31)), "seed settlement", payableAmount,
                        paidAmount, status, confirmTime, paidTime, 1L, "seed:promotion-fixture-tool",
                        now(), now(), 1L, 1L, 0));
    }

    private long insert(Connection conn, String table, List<String> columns, List<?> rawValues) throws SQLException {
        List<Object> values = new ArrayList<>(rawValues);
        StringJoiner colJoin = new StringJoiner(", ");
        StringJoiner markJoin = new StringJoiner(", ");
        for (String col : columns) {
            colJoin.add(col);
            markJoin.add("?");
        }
        String sql = "INSERT INTO " + table + " (" + colJoin + ") VALUES (" + markJoin + ")";
        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            bind(ps, values);
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    return rs.getLong(1);
                }
            }
        }
        return 0L;
    }

    private List<String> columns(Connection conn, String table, String... wanted) throws SQLException {
        List<String> cols = new ArrayList<>();
        for (String col : wanted) {
            if (hasColumn(conn, table, col)) {
                cols.add(col);
            }
        }
        return cols;
    }

    private boolean hasTable(Connection conn, String table) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("""
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = DATABASE() AND table_name = ?
                """)) {
            ps.setString(1, table);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        }
    }

    private boolean hasColumn(Connection conn, String table, String column) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
                """)) {
            ps.setString(1, table);
            ps.setString(2, column);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        }
    }

    private void bind(PreparedStatement ps, List<?> args) throws SQLException {
        for (int i = 0; i < args.size(); i++) {
            ps.setObject(i + 1, args.get(i));
        }
    }

    private Timestamp now() {
        return Timestamp.valueOf(LocalDateTime.now());
    }

    private class InsertData {
        private final Connection conn;
        private final String table;
        private final List<String> columns = new ArrayList<>();
        private final List<Object> values = new ArrayList<>();

        InsertData(Connection conn, String table) {
            this.conn = conn;
            this.table = table;
        }

        InsertData put(String column, Object value) throws SQLException {
            if (hasColumn(conn, table, column)) {
                columns.add(column);
                values.add(value);
            }
            return this;
        }

        InsertData audit() throws SQLException {
            put("create_time", now());
            put("update_time", now());
            put("created_by", 1L);
            put("updated_by", 1L);
            put("deleted", 0);
            return this;
        }
    }

    private static class Fixture {
        long agentId;
        long terminateAgentId;
        long materialId;
        String agentQrCode;
        long frozenRelationId;
        long invalidRelationId;
        long frozenRewardId;
        long frozenRewardRejectId;
        long unsettledSettlementId;
        long confirmedSettlementId;
        long paidSettlementId;

        void printExports() {
            System.out.println("export TEST_AGENT_ID=" + agentId);
            System.out.println("export TEST_TERMINATE_AGENT_ID=" + terminateAgentId);
            System.out.println("export TEST_MATERIAL_ID=" + materialId);
            System.out.println("export TEST_AGENT_QR_CODE=" + agentQrCode);
            System.out.println("export TEST_FROZEN_RELATION_ID=" + frozenRelationId);
            System.out.println("export TEST_INVALID_RELATION_ID=" + invalidRelationId);
            System.out.println("export TEST_FROZEN_REWARD_ID=" + frozenRewardId);
            System.out.println("export TEST_FROZEN_REWARD_REJECT_ID=" + frozenRewardRejectId);
            System.out.println("export TEST_SETTLEMENT_UNSETTLED_ID=" + unsettledSettlementId);
            System.out.println("export TEST_SETTLEMENT_CONFIRMED_ID=" + confirmedSettlementId);
            System.out.println("export TEST_SETTLEMENT_PAID_ID=" + paidSettlementId);
        }
    }
}
