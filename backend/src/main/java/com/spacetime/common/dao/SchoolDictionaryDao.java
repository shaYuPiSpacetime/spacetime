package com.spacetime.common.dao;

import com.spacetime.common.entity.SchoolDictionary;

import java.util.List;

public interface SchoolDictionaryDao {
    List<SchoolDictionary> search(String keyword, int limit);
    SchoolDictionary selectByCode(String code);
    void upsertAll(List<SchoolDictionary> schools);
}
