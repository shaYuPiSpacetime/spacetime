package com.spacetime.common.provider;

import com.spacetime.common.entity.SchoolDictionary;

import java.util.List;

/** 高校搜索第三方抽象，避免业务层依赖具体供应商。 */
public interface CollegeSearchProvider {
    List<SchoolDictionary> search(String keyword, int limit);
}
