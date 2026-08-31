package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.SchoolOptionVO;

import java.util.List;

public interface SchoolDictionaryService {
    List<SchoolOptionVO> search(String keyword, int limit);
}
