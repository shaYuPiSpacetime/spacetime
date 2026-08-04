package com.spacetime.common.dao;

import com.spacetime.common.dao.impl.CommunityExtensionDaoImpl;
import com.spacetime.common.mapper.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

    @InjectMocks CommunityExtensionDaoImpl dao;

    @Test
    void deleteDraftShouldReleaseUniqueKeyWithPhysicalDelete() {
        dao.deleteDraft(18L);

        verify(draftMapper).hardDeleteById(18L);
        verifyNoInteractions(topicMapper, commentLikeMapper, viewMapper, preferenceMapper,
                auditMapper, restrictionMapper, ipBlockMapper, configVersionMapper,
                exportMapper, outboxMapper, mediaAuditTaskMapper);
    }
}
