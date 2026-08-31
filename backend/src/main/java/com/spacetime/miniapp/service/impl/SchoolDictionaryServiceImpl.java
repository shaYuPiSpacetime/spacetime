package com.spacetime.miniapp.service.impl;

import com.spacetime.common.dao.SchoolDictionaryDao;
import com.spacetime.common.entity.SchoolDictionary;
import com.spacetime.common.provider.CollegeSearchProvider;
import com.spacetime.miniapp.dto.response.SchoolOptionVO;
import com.spacetime.miniapp.service.SchoolDictionaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SchoolDictionaryServiceImpl implements SchoolDictionaryService {
    private static final int PROVIDER_THRESHOLD = 10;

    private final SchoolDictionaryDao schoolDictionaryDao;
    private final CollegeSearchProvider collegeSearchProvider;

    @Override
    public List<SchoolOptionVO> search(String keyword, int limit) {
        String normalized = keyword == null ? "" : keyword.trim();
        int pageSize = Math.min(Math.max(limit, 1), 20);
        int lookupSize = Math.max(pageSize, PROVIDER_THRESHOLD);
        List<SchoolDictionary> local = schoolDictionaryDao.search(normalized, lookupSize);
        if (local.size() < PROVIDER_THRESHOLD) {
            try {
                List<SchoolDictionary> remote = collegeSearchProvider.search(normalized, lookupSize);
                if (!remote.isEmpty()) {
                    schoolDictionaryDao.upsertAll(remote);
                    local = schoolDictionaryDao.search(normalized, lookupSize);
                }
            } catch (RuntimeException ex) {
                log.warn("School provider fallback failed, keywordLength={}", normalized.length(), ex);
            }
        }
        return local.stream().limit(pageSize).map(this::toOption).toList();
    }

    private SchoolOptionVO toOption(SchoolDictionary school) {
        SchoolOptionVO option = new SchoolOptionVO();
        option.setCode(school.getSchoolCode() == null ? school.getProviderUuid() : school.getSchoolCode());
        option.setName(school.getSchoolName());
        option.setShortName(school.getShortName());
        option.setProvince(school.getProvince());
        option.setCity(school.getCity());
        option.setIs985(school.getIs985());
        option.setIs211(school.getIs211());
        option.setIsDualClass(school.getIsDualClass());
        option.setSource(school.getSource());
        return option;
    }
}
