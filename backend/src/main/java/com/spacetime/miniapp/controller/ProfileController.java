package com.spacetime.miniapp.controller;

import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.AboutMeAnswerSubmitReq;
import com.spacetime.miniapp.dto.request.AvatarSubmitReq;
import com.spacetime.miniapp.dto.request.BasicProfileSaveReq;
import com.spacetime.miniapp.dto.request.FavoriteSongSaveReq;
import com.spacetime.miniapp.dto.request.IntroductionSubmitReq;
import com.spacetime.miniapp.dto.request.ProfileCodeSaveReq;
import com.spacetime.miniapp.dto.request.ProfileMediaSubmitReq;
import com.spacetime.miniapp.dto.request.ProfileInitStepReq;
import com.spacetime.miniapp.dto.request.ProfileTagsSaveReq;
import com.spacetime.miniapp.dto.request.VoiceIntroSubmitReq;
import com.spacetime.miniapp.dto.request.WechatIdSaveReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.AboutMeDetailVO;
import com.spacetime.miniapp.dto.response.AvatarSubmitVO;
import com.spacetime.miniapp.dto.response.AvatarVerifyDetailVO;
import com.spacetime.miniapp.dto.response.BasicProfileVO;
import com.spacetime.miniapp.dto.response.IntroductionDetailVO;
import com.spacetime.miniapp.dto.response.OpenTextAuditVO;
import com.spacetime.miniapp.dto.response.ProfileDetailVO;
import com.spacetime.miniapp.dto.response.ProfileHomeDetailVO;
import com.spacetime.miniapp.dto.response.ProfileInitStatusVO;
import com.spacetime.miniapp.dto.response.ProfileMediaVO;
import com.spacetime.miniapp.dto.response.SongOptionVO;
import com.spacetime.miniapp.dto.response.VoiceIntroVO;
import com.spacetime.miniapp.service.OpenTextAuditService;
import com.spacetime.miniapp.service.ProfileMediaService;
import com.spacetime.miniapp.service.ProfileService;
import com.spacetime.miniapp.service.VoiceIntroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 小程序用户资料接口
 * 覆盖首登五步初始化、资料详情查看、增量编辑、准入状态查询
 */
@RestController
@RequestMapping("/miniapp/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final OpenTextAuditService openTextAuditService;
    private final VoiceIntroService voiceIntroService;
    private final ProfileMediaService profileMediaService;

    /**
     * 查询首登资料初始化状态
     * @return 当前步骤、下一步、已保存字段
     */
    @GetMapping("/init-status")
    public R<ProfileInitStatusVO> initStatus() {
        return R.ok(profileService.getInitStatus(currentUserId()));
    }

    /**
     * 保存首登五步资料中的任一步
     * @param req 步骤号 + 当前步骤填写的字段
     * @return 更新后的步骤状态
     */
    @PostMapping("/init-step")
    public R<ProfileInitStatusVO> initStep(@Valid @RequestBody ProfileInitStepReq req) {
        return R.ok(profileService.saveInitStep(currentUserId(), req));
    }

    /** 查询我的主页/编辑资料统一详情。 */
    @GetMapping("/home-detail")
    public R<ProfileHomeDetailVO> homeDetail() {
        return R.ok(profileService.getHomeDetail(currentUserId()));
    }

    /** 查询基础资料页反显值、缺失必填项和后台字段配置。 */
    @GetMapping("/basic")
    public R<BasicProfileVO> basicProfile() {
        return R.ok(profileService.getBasicProfile(currentUserId()));
    }

    /**
     * 保存基础资料页。
     * 性别允许修改；隐藏字段不更新；展示且必填的字段缺失时整次保存失败。
     */
    @PutMapping("/basic")
    public R<BasicProfileVO> saveBasicProfile(@RequestBody BasicProfileSaveReq req) {
        return R.ok(profileService.saveBasicProfile(currentUserId(), req));
    }

    /**
     * 添加裁剪后的主头像。
     * 提交成功后立即生成头像待审核记录和提交历史，移动端展示“审核中”。
     */
    @PostMapping("/avatar")
    public R<AvatarSubmitVO> submitAvatar(@Valid @RequestBody AvatarSubmitReq req) {
        return R.ok(profileMediaService.submitAvatar(currentUserId(), req));
    }

    /** 查询头像认证页面回显。 */
    @GetMapping("/avatar")
    public R<AvatarVerifyDetailVO> avatarDetail() {
        return R.ok(profileMediaService.getAvatarDetail(currentUserId()));
    }

    /**
     * 提交强引导第 3 步自我介绍。
     * 内容审核通过前保留旧的已通过内容，不提前对外展示新内容。
     */
    @PostMapping("/introduction")
    public R<OpenTextAuditVO> submitIntroduction(@Valid @RequestBody IntroductionSubmitReq req) {
        return R.ok(openTextAuditService.submitIntroduction(currentUserId(), req));
    }

    /** 查询自我介绍页回显信息，包含最新提交内容和当前对外生效内容。 */
    @GetMapping("/introduction")
    public R<IntroductionDetailVO> introductionDetail() {
        return R.ok(openTextAuditService.getIntroductionDetail(currentUserId()));
    }

    @PutMapping("/dating-goal")
    public R<ProfileDetailVO> saveDatingGoal(@Valid @RequestBody ProfileCodeSaveReq req) {
        return R.ok(profileService.saveDatingGoal(currentUserId(), req));
    }

    @PutMapping("/emotional-status")
    public R<ProfileDetailVO> saveEmotionalStatus(@Valid @RequestBody ProfileCodeSaveReq req) {
        return R.ok(profileService.saveEmotionalStatus(currentUserId(), req));
    }

    @GetMapping("/tags")
    public R<String> tags() {
        return R.ok(profileService.getDetail(currentUserId()).getTags());
    }

    @PutMapping("/tags")
    public R<ProfileDetailVO> saveTags(@RequestBody ProfileTagsSaveReq req) {
        return R.ok(profileService.saveTags(currentUserId(), req));
    }

    @GetMapping("/songs/search")
    public R<List<SongOptionVO>> searchSongs(@RequestParam(required = false) String keyword,
                                             @RequestParam(required = false) Integer limit) {
        return R.ok(profileService.searchSongs(keyword, limit));
    }

    @PutMapping("/favorite-song")
    public R<ProfileDetailVO> saveFavoriteSong(@Valid @RequestBody FavoriteSongSaveReq req) {
        return R.ok(profileService.saveFavoriteSong(currentUserId(), req));
    }

    @GetMapping("/wechat-id")
    public R<String> wechatId() {
        return R.ok(profileService.getDetail(currentUserId()).getWechatId());
    }

    @PutMapping("/wechat-id")
    public R<ProfileDetailVO> saveWechatId(@Valid @RequestBody WechatIdSaveReq req) {
        return R.ok(profileService.saveWechatId(currentUserId(), req));
    }

    /** 查询本人相册记录。 */
    @GetMapping("/albums")
    public R<List<ProfileMediaVO>> albums() {
        return R.ok(profileMediaService.listAlbums(currentUserId()));
    }

    /** 新增相册照片。 */
    @PostMapping("/albums")
    public R<ProfileMediaVO> submitAlbum(@RequestBody ProfileMediaSubmitReq req) {
        if (req == null) {
            req = new ProfileMediaSubmitReq();
        }
        req.setMediaType("ALBUM");
        return R.ok(profileMediaService.submitMedia(currentUserId(), req));
    }

    /** 替换相册照片。 */
    @PutMapping("/albums/{id}")
    public R<ProfileMediaVO> replaceAlbum(@PathVariable Long id, @RequestBody ProfileMediaSubmitReq req) {
        return R.ok(profileMediaService.replaceAlbum(currentUserId(), id, req));
    }

    /** 删除相册照片，审核记录置为失效。 */
    @DeleteMapping("/albums/{id}")
    public R<Void> deleteAlbum(@PathVariable Long id) {
        profileMediaService.deleteMedia(currentUserId(), id);
        return R.ok();
    }

    /** 查询资料背景图。 */
    @GetMapping("/background")
    public R<ProfileMediaVO> profileBackground() {
        return R.ok(profileMediaService.getProfileBackground(currentUserId()));
    }

    /** 提交或替换资料背景图。 */
    @PutMapping("/background")
    public R<ProfileMediaVO> saveProfileBackground(@RequestBody ProfileMediaSubmitReq req) {
        return R.ok(profileMediaService.submitProfileBackground(currentUserId(), req));
    }

    /** 删除当前资料背景图。 */
    @DeleteMapping("/background")
    public R<Void> deleteProfileBackground() {
        profileMediaService.deleteProfileBackground(currentUserId());
        return R.ok();
    }

    /** 查询关于我固定题目回显。 */
    @GetMapping("/about-me")
    public R<AboutMeDetailVO> aboutMe() {
        return R.ok(openTextAuditService.getAboutMeDetail(currentUserId()));
    }

    /** 提交关于我固定题目回答。 */
    @PostMapping("/about-me")
    public R<OpenTextAuditVO> submitAboutMe(@Valid @RequestBody AboutMeAnswerSubmitReq req) {
        return R.ok(openTextAuditService.submitAboutMeAnswer(currentUserId(), req));
    }

    /** 查询语音介绍回显。 */
    @GetMapping("/voice-intro")
    public R<VoiceIntroVO> voiceIntroDetail() {
        return R.ok(voiceIntroService.getVoiceIntro(currentUserId()));
    }

    /** 提交语音介绍，走音频安全机审，不做语音转文字 */
    @PostMapping("/voice-intro")
    public R<VoiceIntroVO> voiceIntro(@RequestBody VoiceIntroSubmitReq req) {
        return R.ok(voiceIntroService.submitVoiceIntro(currentUserId(), req));
    }

    /** 删除当前有效语音介绍 */
    @DeleteMapping("/voice-intro")
    public R<Void> deleteVoiceIntro() {
        voiceIntroService.deleteVoiceIntro(currentUserId());
        return R.ok();
    }

    /**
     * 查询当前用户的准入状态
     * 返回浏览卡片、匹配、曝光三种能力的开关及阻断原因
     * @return 准入状态
     */
    @GetMapping("/access-status")
    public R<AccessStatusVO> accessStatus() {
        return R.ok(profileService.getAccessStatus(currentUserId()));
    }

    /** 从 Token 上下文中获取当前用户ID */
    private Long currentUserId() {
        return UserContextHolder.get().getId();
    }
}
