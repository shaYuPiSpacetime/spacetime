package com.spacetime.miniapp.controller;

import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.MiniappCertificationCenterVO;
import com.spacetime.miniapp.dto.response.MiniappProfileHomeVO;
import com.spacetime.miniapp.service.MiniappProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/miniapp/profile")
@RequiredArgsConstructor
public class MiniappProfileController {
    private final MiniappProfileService profileService;

    @GetMapping("/home")
    public R<MiniappProfileHomeVO> home() {
        return R.ok(profileService.home(currentUserId()));
    }

    @GetMapping("/certification-center")
    public R<MiniappCertificationCenterVO> certificationCenter() {
        return R.ok(profileService.certificationCenter(currentUserId()));
    }

    private Long currentUserId() {
        return UserContextHolder.get().getId();
    }
}
