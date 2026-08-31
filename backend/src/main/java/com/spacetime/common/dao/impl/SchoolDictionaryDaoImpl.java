package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.SchoolDictionaryDao;
import com.spacetime.common.entity.SchoolDictionary;
import com.spacetime.common.mapper.SchoolDictionaryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class SchoolDictionaryDaoImpl implements SchoolDictionaryDao {
    private final SchoolDictionaryMapper mapper;

    @Override
    public List<SchoolDictionary> search(String keyword, int limit) {
        return mapper.search(keyword, limit);
    }

    @Override
    @Transactional
    public void upsertAll(List<SchoolDictionary> schools) {
        for (SchoolDictionary incoming : schools) {
            if (!StringUtils.hasText(incoming.getProviderUuid()) || !StringUtils.hasText(incoming.getSchoolName())) {
                continue;
            }
            SchoolDictionary existing = mapper.selectOne(new LambdaQueryWrapper<SchoolDictionary>()
                    .eq(SchoolDictionary::getProviderUuid, incoming.getProviderUuid())
                    .last("LIMIT 1"));
            if (existing == null) {
                mapper.insert(incoming);
            } else {
                incoming.setId(existing.getId());
                mapper.updateById(incoming);
            }
        }
    }
}
