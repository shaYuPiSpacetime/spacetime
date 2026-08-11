package com.spacetime.common.database;

import com.spacetime.admin.dto.response.AdminMessageRecordDetailVO;
import com.spacetime.admin.dto.response.AdminMessageRecordVO;
import com.spacetime.common.mapper.MessageAdminQueryMapper;
import com.spacetime.common.mapper.AppUserMessageAdminQueryMapper;
import com.spacetime.common.model.message.MessageAdminRecordFilter;
import org.apache.ibatis.mapping.MappedStatement;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PRD-03 后台消息元数据查询契约")
class MessageAdminQueryMapperContractTest {

    @Test
    @DisplayName("MyBatis 应能解析列表、统计和详情动态 SQL 且不选择正文")
    void mapperSqlShouldParseWithoutSensitiveBodyColumns() {
        Configuration configuration = new Configuration();
        configuration.addMapper(MessageAdminQueryMapper.class);
        Map<String, Object> params = new HashMap<>();
        params.put("filter", new MessageAdminRecordFilter());
        params.put("offset", 0);
        params.put("limit", 20);
        params.put("recordNo", "MSG-001");

        for (String method : Set.of("selectPage", "count", "stats", "selectByRecordNo")) {
            MappedStatement statement = configuration.getMappedStatement(
                    MessageAdminQueryMapper.class.getName() + "." + method);
            String sql = statement.getBoundSql(params).getSql().toLowerCase(Locale.ROOT);
            assertThat(sql).contains("app_message_record", "app_system_message", "app_assistant_message");
            assertThat(sql).doesNotContain("content_text", "content_ciphertext", "title_ciphertext",
                    "content_iv", "title_iv", "content_hmac", "title_hmac");
        }
    }

    @Test
    @DisplayName("通用消息列表和详情 VO 不得暴露正文、密文或内容摘要字段")
    void adminProjectionShouldNotExposeSensitiveContentFields() {
        Set<String> forbidden = Set.of("content", "contentText", "contentSummary", "ciphertext",
                "contentCiphertext", "contentIv", "titleCiphertext", "titleIv", "contentHmac",
                "titleHmac");

        assertThat(fieldNames(AdminMessageRecordVO.class)).doesNotContainAnyElementsOf(forbidden);
        assertThat(fieldNames(AdminMessageRecordDetailVO.class)).doesNotContainAnyElementsOf(forbidden);
    }

    @Test
    @DisplayName("App 用户四列表查询不得选择私信、系统或助手正文")
    void appUserMessageQueriesShouldExcludeSensitiveBodyColumns() {
        Configuration configuration = new Configuration();
        configuration.addMapper(AppUserMessageAdminQueryMapper.class);
        Map<String, Object> params = new HashMap<>();
        params.put("userId", 1L);
        params.put("offset", 0);
        params.put("limit", 5);
        params.put("now", java.time.LocalDateTime.now());

        for (String method : Set.of("selectPrivateMessages", "countPrivateMessages",
                "countPrivateUnread", "selectPlatformMessages", "countPlatformMessages",
                "countSystemUnread", "countAssistantUnread")) {
            MappedStatement statement = configuration.getMappedStatement(
                    AppUserMessageAdminQueryMapper.class.getName() + "." + method);
            String sql = statement.getBoundSql(params).getSql().toLowerCase(Locale.ROOT);
            assertThat(sql).doesNotContain("content_text", "content_ciphertext", "title_ciphertext",
                    "content_iv", "title_iv", "content_hmac", "title_hmac");
        }
    }

    private Set<String> fieldNames(Class<?> type) {
        return Arrays.stream(type.getDeclaredFields())
                .map(Field::getName)
                .collect(Collectors.toSet());
    }
}
