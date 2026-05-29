package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.MiniappCertificationCenterVO;
import com.spacetime.miniapp.dto.response.MiniappProfileHomeVO;

public interface MiniappProfileService {
    MiniappProfileHomeVO home(Long userId);
    MiniappCertificationCenterVO certificationCenter(Long userId);
}
