package com.spacetime.common.dao;

import com.spacetime.common.dao.impl.IdealSnapshotCandidateDaoImpl;
import com.spacetime.common.entity.IdealSnapshotCandidate;
import com.spacetime.common.mapper.IdealSnapshotCandidateMapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.scripting.xmltags.XMLLanguageDriver;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** 全量理想型快照分批落库与真实 MyBatis 参数绑定回归。 */
class IdealSnapshotCandidateBatchTest {
    @Test
    void writes1201RowsInThreeStatementsWithoutPerRowInsert() {
        IdealSnapshotCandidateMapper mapper = mock(IdealSnapshotCandidateMapper.class);
        IdealSnapshotCandidateDaoImpl dao = new IdealSnapshotCandidateDaoImpl(mapper);
        List<IdealSnapshotCandidate> rows = IntStream.range(0, 1201).mapToObj(i -> {
            IdealSnapshotCandidate row = new IdealSnapshotCandidate();
            row.setCandidateUserId((long) i);
            return row;
        }).toList();
        dao.insertBatch(rows);
        ArgumentCaptor<List<IdealSnapshotCandidate>> batches = ArgumentCaptor.forClass(List.class);
        verify(mapper, times(3)).insertRows(batches.capture());
        assertThat(batches.getAllValues()).extracting(List::size).containsExactly(500, 500, 201);
        assertThat(batches.getAllValues().stream().flatMap(List::stream).toList()).containsExactlyElementsOf(rows);
        verifyNoMoreInteractions(mapper);
    }

    @Test
    void emptyBatchDoesNotIssueInvalidSql() {
        IdealSnapshotCandidateMapper mapper = mock(IdealSnapshotCandidateMapper.class);
        IdealSnapshotCandidateDaoImpl dao = new IdealSnapshotCandidateDaoImpl(mapper);
        dao.insertBatch(null);
        dao.insertBatch(List.of());
        verifyNoInteractions(mapper);
    }

    @Test
    void mapperBindsRowsAndKeepsAuditAndLogicalDeleteColumns() throws Exception {
        String sql = String.join("\n", IdealSnapshotCandidateMapper.class
                .getMethod("insertRows", List.class).getAnnotation(Insert.class).value());
        IdealSnapshotCandidate first = new IdealSnapshotCandidate();
        first.setItemNo("quote'not-sql");
        IdealSnapshotCandidate second = new IdealSnapshotCandidate();
        second.setItemNo("second");
        var bound = new XMLLanguageDriver().createSqlSource(new Configuration(), sql, Map.class)
                .getBoundSql(Map.of("rows", List.of(first, second)));
        assertThat(bound.getParameterMappings()).hasSize(16);
        assertThat(bound.getSql()).contains("created_by", "updated_by", "create_time", "update_time", "deleted")
                .doesNotContain("quote'not-sql", "second", "${");
        assertThat(bound.getAdditionalParameter("__frch_row_0.itemNo")).isEqualTo("quote'not-sql");
        assertThat(bound.getAdditionalParameter("__frch_row_1.itemNo")).isEqualTo("second");
    }
}
