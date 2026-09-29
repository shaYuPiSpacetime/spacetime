package com.spacetime.common.dao;

import com.spacetime.common.entity.SchoolDictionary;

import java.util.List;

public interface SchoolDictionaryDao {
    List<SchoolDictionary> search(String keyword, int limit);
    SchoolDictionary selectByCode(String code);
    /** 批量查找启用的学校编码或提供方编码，避免理想型逐人查询。 */
    List<SchoolDictionary> selectByCodes(List<String> codes);
    void upsertAll(List<SchoolDictionary> schools);
}
