package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.MiniappSearchResultPageVO;

public interface MiniappSearchResultService {
    MiniappSearchResultPageVO search(Long userId,
                                     String keyword,
                                     String type,
                                     String sourceScene,
                                     int page,
                                     int size);
}
