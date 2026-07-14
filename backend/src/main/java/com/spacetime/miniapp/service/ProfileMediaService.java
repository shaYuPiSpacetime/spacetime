package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.AvatarSubmitReq;
import com.spacetime.miniapp.dto.request.ProfileMediaSubmitReq;
import com.spacetime.miniapp.dto.response.AvatarSubmitVO;
import com.spacetime.miniapp.dto.response.AvatarVerifyDetailVO;
import com.spacetime.miniapp.dto.response.ProfileMediaVO;

import java.util.List;

/** 小程序资料媒体服务。 */
public interface ProfileMediaService {
    /** 查询头像认证页回显。 */
    AvatarVerifyDetailVO getAvatarDetail(Long userId);

    /** 提交裁剪后的主头像，并生成头像审核记录。 */
    AvatarSubmitVO submitAvatar(Long userId, AvatarSubmitReq req);

    /** 查询本人相册记录，包含待审核、已驳回、已通过，排除已失效。 */
    List<ProfileMediaVO> listAlbums(Long userId);

    /** 查询本人资料背景图记录。 */
    ProfileMediaVO getProfileBackground(Long userId);

    /** 提交相册或资料背景图，进入资料图片审核。 */
    ProfileMediaVO submitMedia(Long userId, ProfileMediaSubmitReq req);

    /** 提交或替换资料背景图。 */
    ProfileMediaVO submitProfileBackground(Long userId, ProfileMediaSubmitReq req);

    /** 替换一张相册照片：旧记录失效，新照片重新提审。 */
    ProfileMediaVO replaceAlbum(Long userId, Long mediaId, ProfileMediaSubmitReq req);

    /** 删除资料媒体：不物理删除审核记录，改为失效并保留历史。 */
    void deleteMedia(Long userId, Long mediaId);

    /** 删除当前资料背景图。 */
    void deleteProfileBackground(Long userId);
}
