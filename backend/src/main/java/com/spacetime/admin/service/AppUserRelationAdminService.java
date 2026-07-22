package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.RelationPageReq;
import com.spacetime.admin.dto.request.RelationUnlockPageReq;
import com.spacetime.admin.dto.response.AppUserRelationLikeVO;
import com.spacetime.admin.dto.response.AppUserRelationMatchVO;
import com.spacetime.admin.dto.response.AppUserRelationSummaryVO;
import com.spacetime.admin.dto.response.AppUserRelationUnlockVO;
import com.spacetime.admin.dto.response.AppUserRelationVisitVO;

/** 管理后台 APP 用户关系反馈只读查询服务。 */
public interface AppUserRelationAdminService {
    AppUserRelationSummaryVO summary(Long userId);
    Page<AppUserRelationLikeVO> likes(Long userId, RelationPageReq req);
    Page<AppUserRelationVisitVO> visits(Long userId, RelationPageReq req);
    Page<AppUserRelationMatchVO> matches(Long userId, RelationPageReq req);
    Page<AppUserRelationUnlockVO> unlocks(Long userId, RelationUnlockPageReq req);
}
