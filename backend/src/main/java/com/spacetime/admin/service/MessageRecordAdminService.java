package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.MessageRecordExportReq;
import com.spacetime.admin.dto.request.MessageRecordPageReq;
import com.spacetime.admin.dto.response.AdminMessageRecordDetailVO;
import com.spacetime.admin.dto.response.AdminMessageRecordVO;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.MessageRecordStatsVO;

/** 管理后台消息元数据查询与固定字段导出。 */
public interface MessageRecordAdminService {
    MessageRecordStatsVO stats(MessageRecordPageReq req);
    Page<AdminMessageRecordVO> records(MessageRecordPageReq req);
    AdminMessageRecordDetailVO detail(String recordNo);
    ExportTaskVO export(MessageRecordExportReq req);
}
