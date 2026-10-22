package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.spacetime.common.dao.impl.SchoolDictionaryDaoImpl;
import com.spacetime.common.entity.SchoolDictionary;
import com.spacetime.common.mapper.SchoolDictionaryMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SchoolDictionaryDaoImplTest {

    @Test
    void newSchoolShouldDefaultCanonicalCodeToStableSchoolCode() {
        SchoolDictionaryMapper mapper = mock(SchoolDictionaryMapper.class);
        when(mapper.selectOne(any(Wrapper.class))).thenReturn(null);
        SchoolDictionary incoming = school("P-1", "S-1", null);

        new SchoolDictionaryDaoImpl(mapper).upsertAll(List.of(incoming));

        assertThat(incoming.getCanonicalSchoolCode()).isEqualTo("S-1");
        verify(mapper).insert(incoming);
    }

    @Test
    void providerRefreshShouldPreserveExistingCanonicalMerge() {
        SchoolDictionaryMapper mapper = mock(SchoolDictionaryMapper.class);
        SchoolDictionary existing = school("P-1", "OLD", "UNIVERSITY-1");
        existing.setId(9L);
        when(mapper.selectOne(any(Wrapper.class))).thenReturn(existing);
        SchoolDictionary incoming = school("P-1", "NEW", "NEW");

        new SchoolDictionaryDaoImpl(mapper).upsertAll(List.of(incoming));

        assertThat(incoming.getId()).isEqualTo(9L);
        assertThat(incoming.getCanonicalSchoolCode()).isEqualTo("UNIVERSITY-1");
        verify(mapper).updateById(incoming);
    }

    private SchoolDictionary school(String providerUuid, String schoolCode,
                                    String canonicalSchoolCode) {
        SchoolDictionary school = new SchoolDictionary();
        school.setProviderUuid(providerUuid);
        school.setSchoolCode(schoolCode);
        school.setCanonicalSchoolCode(canonicalSchoolCode);
        school.setSchoolName("测试大学");
        return school;
    }
}
