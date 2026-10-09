package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.spacetime.common.dao.impl.AppUserAuditRecordDaoImpl;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.mapper.AppUserAuditRecordMapper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

/** 失败任务恢复必须使用状态和任务关联的条件更新。 */
class AppUserAuditRecordDaoImplTest {
    @BeforeAll
    static void initTableInfo() {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), AppUserAuditRecord.class);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void orphanRecoveryMustNotOverwriteNewlyBoundTask() {
        AppUserAuditRecordMapper mapper = mock(AppUserAuditRecordMapper.class);
        when(mapper.update(isNull(), any())).thenReturn(1);
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(100L); record.setStatus("EXPIRED"); record.setAuditSource("MACHINE");
        record.setExpiredReason("请重新提交");
        assertThat(new AppUserAuditRecordDaoImpl(mapper).expirePending(record, "PENDING")).isTrue();
        ArgumentCaptor<LambdaUpdateWrapper<AppUserAuditRecord>> captor = ArgumentCaptor.forClass((Class) LambdaUpdateWrapper.class);
        verify(mapper).update(isNull(), captor.capture());
        assertThat(captor.getValue().getSqlSegment().toLowerCase())
                .contains("status", "audit_source", "provider_task_id is null", "id");
        assertThat(captor.getValue().getParamNameValuePairs().values()).contains(100L, "PENDING", "MACHINE");
        assertThat(captor.getValue().getSqlSet().toLowerCase()).contains("status", "expired_reason", "audit_time");
    }
}
