package com.spacetime.miniapp.controller;

import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.MiniappCertificationCenterVO;
import com.spacetime.miniapp.dto.response.MiniappProfileHomeVO;
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.service.MiniappPublicProfileService;
import com.spacetime.miniapp.service.MiniappProfileService;
import com.spacetime.miniapp.service.CommunityService;
import com.spacetime.miniapp.dto.response.CommunityPostCardVO;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/miniapp/profile")
@RequiredArgsConstructor
public class MiniappProfileController {
    private final MiniappProfileService profileService;
    private final MiniappPublicProfileService publicProfileService;
    private final CommunityService communityService;

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

    /** 分享主页游客只读入口，只返回审核通过的公开资料。 */
    @GetMapping("/shared/{userId}")
    public R<PublicProfileVO> sharedProfile(@PathVariable Long userId) {
        return R.ok(publicProfileService.getPublicProfile(null, userId));
    }

    /** 分享主页只展示可公开用户的已发布动态。 */
    @GetMapping("/shared/{userId}/posts")
    public R<Page<CommunityPostCardVO>> sharedPosts(@PathVariable Long userId,
                                                  @RequestParam(defaultValue = "1") int page,
                                                  @RequestParam(defaultValue = "20") int size) {
        publicProfileService.getPublicProfile(null, userId);
        return R.ok(communityService.getUserPosts(null, String.valueOf(userId), false, page, size));
    }

    private Long currentUserId() {
        return UserContextHolder.get().getId();
    }
}
