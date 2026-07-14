package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.BasicProfileSaveReq;
import com.spacetime.miniapp.dto.request.FavoriteSongSaveReq;
import com.spacetime.miniapp.dto.request.ProfileCodeSaveReq;
import com.spacetime.miniapp.dto.request.ProfileInitStepReq;
import com.spacetime.miniapp.dto.request.ProfileTagsSaveReq;
import com.spacetime.miniapp.dto.request.WechatIdSaveReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.BasicProfileVO;
import com.spacetime.miniapp.dto.response.ProfileDetailVO;
import com.spacetime.miniapp.dto.response.ProfileHomeDetailVO;
import com.spacetime.miniapp.dto.response.ProfileInitStatusVO;
import com.spacetime.miniapp.dto.response.SongOptionVO;

import java.util.List;

/**
 * 用户资料服务
 */
public interface ProfileService {
    /**
     * 查询首登初始化状态
     * @param userId 用户ID
     * @return 是否已完成 + 当前步骤 + 下一步 + 已保存字段
     */
    ProfileInitStatusVO getInitStatus(Long userId);

    /**
     * 保存首登五步资料中的任一步
     * @param userId 用户ID
     * @param req 步骤号 + 当前步骤字段
     * @return 更新后的步骤状态
     */
    ProfileInitStatusVO saveInitStep(Long userId, ProfileInitStepReq req);

    /**
     * 查看资料详情
     * @param userId 用户ID
     * @return 完整资料 + 准入状态
     */
    ProfileDetailVO getDetail(Long userId);

    /** 查询我的主页/编辑资料统一详情。 */
    ProfileHomeDetailVO getHomeDetail(Long userId);

    /** 查询基础资料页反显值与动态字段配置。 */
    BasicProfileVO getBasicProfile(Long userId);

    /** 保存基础资料页全部已展示字段。 */
    BasicProfileVO saveBasicProfile(Long userId, BasicProfileSaveReq req);

    /** 保存脱单目标。 */
    ProfileDetailVO saveDatingGoal(Long userId, ProfileCodeSaveReq req);

    /** 保存感情状态。 */
    ProfileDetailVO saveEmotionalStatus(Long userId, ProfileCodeSaveReq req);

    /** 保存我的标签。 */
    ProfileDetailVO saveTags(Long userId, ProfileTagsSaveReq req);

    /** 搜索爱听歌曲。 */
    List<SongOptionVO> searchSongs(String keyword, Integer limit);

    /** 保存爱听歌曲。 */
    ProfileDetailVO saveFavoriteSong(Long userId, FavoriteSongSaveReq req);

    /** 保存微信号。 */
    ProfileDetailVO saveWechatId(Long userId, WechatIdSaveReq req);

    /**
     * 查询准入状态
     * @param userId 用户ID
     * @return 三种能力的开关 + 阻断原因
     */
    AccessStatusVO getAccessStatus(Long userId);
}
