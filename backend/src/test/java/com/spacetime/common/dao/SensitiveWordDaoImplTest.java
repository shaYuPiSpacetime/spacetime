package com.spacetime.common.dao;

import com.spacetime.common.dao.impl.SensitiveWordDaoImpl;
import com.spacetime.common.entity.ContentSensitiveWord;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.mapper.ContentSensitiveWordMapper;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SensitiveWordDaoImplTest {
    @Test void editingWithDifferentOperatorReplacesLoadedAuditFields() {
        var mapper=mock(ContentSensitiveWordMapper.class);
        var dao=new SensitiveWordDaoImpl(mapper);
        var row=new ContentSensitiveWord();row.setId(8L);row.setUpdatedBy(11L);
        var old=LocalDateTime.of(2020,1,1,0,0);row.setUpdateTime(old);row.setCreatedBy(11L);
        when(mapper.updateById(row)).thenReturn(1);
        try {
            for (long operator : new long[]{22L,33L}) {
                var context=new UserContext();context.setId(operator);UserContextHolder.set(context);
                dao.update(row);
                assertThat(row.getUpdatedBy()).isEqualTo(operator);
                assertThat(row.getUpdateTime()).isAfter(old);
                assertThat(row.getCreatedBy()).isEqualTo(11L);
            }
            verify(mapper,times(2)).updateById(row);
        } finally {UserContextHolder.clear();}
    }
}
