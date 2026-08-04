package com.spacetime.miniapp.controller;

import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.MiniappCertificationCenterVO;
import com.spacetime.miniapp.dto.response.MiniappProfileHomeVO;
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.service.MiniappPublicProfileService;
import com.spacetime.miniapp.service.MiniappProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/miniapp/profile")
@RequiredArgsConstructor
public class MiniappProfileController {
    private final MiniappProfileService profileService;
    private final MiniappPublicProfileService publicProfileService;

    @GetMapping("/home")
    public R<MiniappProfileHomeVO> home() {
        return R.ok(profileService.home(currentUserId()));
    }

    @GetMapping("/certification-center")
    public R<MiniappCertificationCenterVO> certificationCenter() {
        return R.ok(profileService.certificationCenter(currentUserId()));
    }

    @GetMapping("/public/{userId}")
    public R<PublicProfileVO> publicProfile(@PathVariable Long userId) {
        return R.ok(publicProfileService.getPublicProfile(currentUserId(), userId));
    }

    private Long currentUserId() {
        return UserContextHolder.get().getId();
    }
}
