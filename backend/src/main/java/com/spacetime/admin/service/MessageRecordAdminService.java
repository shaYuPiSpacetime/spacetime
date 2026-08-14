package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.MessageRecordExportReq;
import com.spacetime.admin.dto.request.MessageRecordPageReq;
import com.spacetime.admin.dto.request.SensitiveContentViewReq;
import com.spacetime.admin.dto.response.AdminSensitiveMessageContentVO;
import com.spacetime.admin.dto.response.AdminMessageRecordDetailVO;
import com.spacetime.admin.dto.response.AdminMessageRecordVO;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.MessageRecordStatsVO;

/** 管理后台消息元数据查询与固定字段导出。 */
public interface MessageRecordAdminService {
    MessageRecordStatsVO stats();
    Page<AdminMessageRecordVO> records(MessageRecordPageReq req);
    AdminMessageRecordDetailVO detail(String recordNo);
    AdminSensitiveMessageContentVO viewContent(String recordNo, SensitiveContentViewReq req);
    ExportTaskVO export(MessageRecordExportReq req);
}
