package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.CancelRequestPageReq;
import com.spacetime.admin.dto.request.CancelRequestRemarkReq;
import com.spacetime.admin.dto.response.AdminCancelRequestVO;

public interface UserSecurityCancelAdminService {
    Page<AdminCancelRequestVO> list(CancelRequestPageReq req);
    AdminCancelRequestVO detail(Long id);
    void remark(Long id, CancelRequestRemarkReq req);
}
