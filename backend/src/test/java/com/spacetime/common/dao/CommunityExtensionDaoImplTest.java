package com.spacetime.common.dao;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.impl.CommunityExtensionDaoImpl;
import com.spacetime.common.entity.CommunityAuditRecord;
import com.spacetime.common.mapper.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class CommunityExtensionDaoImplTest {

    @Mock CommunityTopicMapper topicMapper;
    @Mock CommunityCommentLikeMapper commentLikeMapper;
    @Mock CommunityPostDraftMapper draftMapper;
    @Mock CommunityViewHistoryMapper viewMapper;
    @Mock CommunityContentPreferenceMapper preferenceMapper;
    @Mock CommunityAuditRecordMapper auditMapper;
    @Mock CommunityUserRestrictionMapper restrictionMapper;
    @Mock CommunityIpBlockMapper ipBlockMapper;
    @Mock CommunityConfigVersionMapper configVersionMapper;
    @Mock CommunityExportTaskMapper exportMapper;
    @Mock CommunityEventOutboxMapper outboxMapper;
    @Mock CommunityMediaAuditTaskMapper mediaAuditTaskMapper;
    @Spy ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks CommunityExtensionDaoImpl dao;

    @Test
    void insertAuditShouldConvertPlainTextSnapshotsToValidJsonStrings() {
        CommunityAuditRecord record = new CommunityAuditRecord();
        record.setBeforeSnapshot("pending_manual");
        record.setAfterSnapshot("published");

        dao.insertAudit(record);

        verify(auditMapper).insert(argThat((CommunityAuditRecord value) ->
                "\"pending_manual\"".equals(value.getBeforeSnapshot())
                        && "\"published\"".equals(value.getAfterSnapshot())));
    }

    @Test
    void insertAuditShouldConvertBlankSnapshotToValidJsonString() {
        CommunityAuditRecord record = new CommunityAuditRecord();
        record.setBeforeSnapshot("");

        dao.insertAudit(record);

        verify(auditMapper).insert(argThat((CommunityAuditRecord value) ->
                "\"\"".equals(value.getBeforeSnapshot())));
    }

    @Test
    void deleteDraftShouldReleaseUniqueKeyWithPhysicalDelete() {
        dao.deleteDraft(18L);

        verify(draftMapper).hardDeleteById(18L);
        verifyNoInteractions(topicMapper, commentLikeMapper, viewMapper, preferenceMapper,
                auditMapper, restrictionMapper, ipBlockMapper, configVersionMapper,
                exportMapper, outboxMapper, mediaAuditTaskMapper);
    }
}
