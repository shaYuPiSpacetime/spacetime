package com.spacetime.miniapp.service;

import com.spacetime.common.dao.SchoolDictionaryDao;
import com.spacetime.common.entity.SchoolDictionary;
import com.spacetime.common.provider.CollegeSearchProvider;
import com.spacetime.miniapp.dto.response.SchoolOptionVO;
import com.spacetime.miniapp.service.impl.SchoolDictionaryServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("学校字典搜索服务")
class SchoolDictionaryServiceImplTest {

    @Mock private SchoolDictionaryDao schoolDictionaryDao;
    @Mock private CollegeSearchProvider collegeSearchProvider;

    @Test
    @DisplayName("本地结果达到10条时不请求第三方")
    void shouldUseLocalResultsWithoutProviderWhenPageIsFull() {
        List<SchoolDictionary> local = java.util.stream.IntStream.rangeClosed(1, 10)
                .mapToObj(index -> school("LOCAL-" + index, "浙江大学" + index, "LOCAL"))
                .toList();
        when(schoolDictionaryDao.search("浙江", 10)).thenReturn(local);
        SchoolDictionaryService service = new SchoolDictionaryServiceImpl(schoolDictionaryDao, collegeSearchProvider);

        List<SchoolOptionVO> result = service.search(" 浙江 ", 10);

        assertThat(result).hasSize(10);
        verify(collegeSearchProvider, never()).search(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyInt());
        verify(schoolDictionaryDao, never()).upsertAll(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    @DisplayName("本地不足10条时请求第三方、回写本地后返回最新结果")
    void shouldFetchProviderAndUpsertWhenLocalPageIsNotFull() {
        List<SchoolDictionary> local = List.of(school("LOCAL-ZJU", "浙江大学", "LOCAL"));
        List<SchoolDictionary> remote = List.of(
                school("GUGU-NBU", "宁波大学", "GUGUDATA"),
                school("GUGU-ZJUT", "浙江工业大学", "GUGUDATA"));
        List<SchoolDictionary> refreshed = List.of(local.get(0), remote.get(1));
        when(schoolDictionaryDao.search("浙江", 10)).thenReturn(local, refreshed);
        when(collegeSearchProvider.search("浙江", 10)).thenReturn(remote);
        SchoolDictionaryService service = new SchoolDictionaryServiceImpl(schoolDictionaryDao, collegeSearchProvider);

        List<SchoolOptionVO> result = service.search("浙江", 10);

        verify(schoolDictionaryDao).upsertAll(remote);
        assertThat(result).extracting(SchoolOptionVO::getName)
                .containsExactly("浙江大学", "浙江工业大学");
        assertThat(result.get(1).getSource()).isEqualTo("GUGUDATA");
    }

    @Test
    @DisplayName("客户端只请求5条时，本地少于10条仍请求第三方")
    void shouldUseFixedTenItemProviderThreshold() {
        List<SchoolDictionary> local = java.util.stream.IntStream.rangeClosed(1, 5)
                .mapToObj(index -> school("LOCAL-" + index, "浙江学校" + index, "LOCAL"))
                .toList();
        List<SchoolDictionary> remote = List.of(school("GUGU-ZJU", "浙江大学", "GUGUDATA"));
        when(schoolDictionaryDao.search("浙江", 10)).thenReturn(local, local);
        when(collegeSearchProvider.search("浙江", 10)).thenReturn(remote);
        SchoolDictionaryService service = new SchoolDictionaryServiceImpl(schoolDictionaryDao, collegeSearchProvider);

        List<SchoolOptionVO> result = service.search("浙江", 5);

        verify(schoolDictionaryDao).upsertAll(remote);
        assertThat(result).hasSize(5);
    }

    @Test
    @DisplayName("第三方异常时降级返回已有本地结果")
    void shouldFallbackToLocalResultsWhenProviderFails() {
        List<SchoolDictionary> local = List.of(school("LOCAL-ZJU", "浙江大学", "LOCAL"));
        when(schoolDictionaryDao.search("浙江", 10)).thenReturn(local);
        when(collegeSearchProvider.search("浙江", 10)).thenThrow(new IllegalStateException("provider unavailable"));
        SchoolDictionaryService service = new SchoolDictionaryServiceImpl(schoolDictionaryDao, collegeSearchProvider);

        List<SchoolOptionVO> result = service.search("浙江", 10);

        assertThat(result).extracting(SchoolOptionVO::getName).containsExactly("浙江大学");
        verify(schoolDictionaryDao, never()).upsertAll(org.mockito.ArgumentMatchers.anyList());
    }

    private SchoolDictionary school(String code, String name, String source) {
        SchoolDictionary school = new SchoolDictionary();
        school.setProviderUuid(code);
        school.setSchoolCode(code);
        school.setSchoolName(name);
        school.setProvince("浙江省");
        school.setCity("杭州市");
        school.setSource(source);
        school.setStatus("ENABLED");
        return school;
    }
}
