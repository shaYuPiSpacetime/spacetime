package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.FeedbackPageReq;
import com.spacetime.admin.dto.request.FeedbackStatusUpdateReq;
import com.spacetime.admin.dto.response.AdminFeedbackVO;

public interface UserSecurityFeedbackAdminService {
    Page<AdminFeedbackVO> list(FeedbackPageReq req);
    AdminFeedbackVO detail(Long id);
    void updateStatus(Long id, FeedbackStatusUpdateReq req);
}
