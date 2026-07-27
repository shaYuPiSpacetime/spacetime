package com.spacetime.common.service;

import com.spacetime.common.enums.AppUserAuditTypeEnum;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * 用户审核内容统一查询服务。
 *
 * <p>所有头像、相册、背景图和开放文字均从审核记录实时派生，不读取用户主表快照。</p>
 */
public interface AppUserAuditContentService {

    /** 本人头像取最新头像审核记录，不受审核状态限制。 */
    String ownerAvatar(Long userId);

    /** 批量查询本人/后台可见的最新头像，供列表场景使用。 */
    Map<Long, String> ownerAvatars(Collection<Long> userIds);

    /** 对外头像仅在最新头像审核记录已通过时返回。 */
    String publicAvatar(Long userId);

    /** 批量查询对外头像，供列表场景使用，避免逐用户查询。 */
    Map<Long, String> publicAvatars(Collection<Long> userIds);

    /** 本人开放文字取该类型最新提交记录。 */
    String ownerText(Long userId, AppUserAuditTypeEnum type);

    /** 对外开放文字取该类型最近已通过记录。 */
    String publicText(Long userId, AppUserAuditTypeEnum type);

    /** 本人资料背景图取最新提交记录。 */
    String ownerProfileBackground(Long userId);

    /** 对外资料背景图取最近已通过记录。 */
    String publicProfileBackground(Long userId);

    /** 本人相册返回未失效的提交图片。 */
    List<String> ownerAlbumPhotos(Long userId);

    /** 批量查询本人/后台可见的未失效相册图片。 */
    Map<Long, List<String>> ownerAlbumPhotos(Collection<Long> userIds);

    /** 对外相册只返回已通过图片。 */
    List<String> publicAlbumPhotos(Long userId);

    /** 批量查询对外可见的已通过相册图片，供发现列表使用。 */
    Map<Long, List<String>> publicAlbumPhotos(Collection<Long> userIds);
}
