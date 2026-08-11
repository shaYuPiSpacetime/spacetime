package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.MessageRecordExportReq;
import com.spacetime.admin.dto.request.MessageRecordPageReq;
import com.spacetime.admin.dto.response.AdminMessageRecordDetailVO;
import com.spacetime.admin.dto.response.AdminMessageRecordVO;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.MessageRecordStatsVO;
import com.spacetime.admin.service.MessageRecordAdminService;
import com.spacetime.common.dao.AppUserExportTaskDao;
import com.spacetime.common.dao.MessageAdminQueryDao;
import com.spacetime.common.entity.AppUserExportTask;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.model.message.MessageAdminRecordFilter;
import com.spacetime.common.model.message.MessageAdminRecordProjection;
import com.spacetime.common.model.message.MessageAdminRecordStatsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** 消息记录只读元数据查询实现。 */
@Service
@RequiredArgsConstructor
public class MessageRecordAdminServiceImpl implements MessageRecordAdminService {
    private static final int EXPORT_LIMIT = 10_000;
    private static final DateTimeFormatter FILE_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final MessageAdminQueryDao queryDao;
    private final AppUserExportTaskDao exportTaskDao;

    @Override
    public MessageRecordStatsVO stats(MessageRecordPageReq req) {
        MessageAdminRecordStatsProjection value = queryDao.stats(filter(req));
        MessageRecordStatsVO vo = new MessageRecordStatsVO();
        if (value == null) {
            vo.setTotalCount(0L);
            vo.setPrivateMessageCount(0L);
            vo.setWhisperMessageCount(0L);
            vo.setSystemMessageCount(0L);
            vo.setAssistantMessageCount(0L);
            vo.setFailedCount(0L);
            vo.setCaseLinkedCount(0L);
            return vo;
        }
        vo.setTotalCount(zero(value.getTotalCount()));
        vo.setPrivateMessageCount(zero(value.getPrivateMessageCount()));
        vo.setWhisperMessageCount(zero(value.getWhisperMessageCount()));
        vo.setSystemMessageCount(zero(value.getSystemMessageCount()));
        vo.setAssistantMessageCount(zero(value.getAssistantMessageCount()));
        vo.setFailedCount(zero(value.getFailedCount()));
        vo.setCaseLinkedCount(zero(value.getCaseLinkedCount()));
        return vo;
    }

    @Override
    public Page<AdminMessageRecordVO> records(MessageRecordPageReq req) {
        MessageRecordPageReq safe = req == null ? new MessageRecordPageReq() : req;
        MessageAdminRecordFilter filter = filter(safe);
        long total = queryDao.count(filter);
        int offset = (safe.getPage() - 1) * safe.getSize();
        List<AdminMessageRecordVO> records = queryDao.selectPage(filter, offset, safe.getSize())
                .stream().map(this::toListVO).toList();
        Page<AdminMessageRecordVO> page = new Page<>(safe.getPage(), safe.getSize(), total);
        page.setRecords(records);
        return page;
    }

    @Override
    public AdminMessageRecordDetailVO detail(String recordNo) {
        if (!StringUtils.hasText(recordNo)) throw new BusinessException(4001, "消息记录编号不能为空");
        MessageAdminRecordProjection value = queryDao.selectByRecordNo(recordNo.trim());
        if (value == null) throw new BusinessException(30022, "消息记录不存在");
        return toDetailVO(value);
    }

    @Override
    @Transactional
    public ExportTaskVO export(MessageRecordExportReq req) {
        if (req == null || !req.isConfirmNoContent()) {
            throw new BusinessException(4001, "必须确认导出文件不包含消息正文");
        }
        List<MessageAdminRecordProjection> values = queryDao.selectPage(filter(req), 0, EXPORT_LIMIT + 1);
        if (values.size() > EXPORT_LIMIT) {
            throw new BusinessException(4001, "单次最多导出10000条，请缩小筛选范围");
        }
        LocalDateTime now = LocalDateTime.now();
        String taskNo = "MSG-EXPORT-" + now.format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"))
                + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
        String csv = buildCsv(values);
        String summary = filterSummary(req);
        AppUserExportTask task = new AppUserExportTask();
        task.setTaskNo(taskNo);
        task.setExportType("MESSAGE_METADATA");
        task.setStatus("CREATED");
        task.setMessage("消息元数据导出文件已生成，固定字段不包含消息正文、密文或内容摘要");
        task.setFilterSummary(summary);
        task.setFileName("message-metadata-" + now.format(FILE_TIME) + ".csv");
        task.setRowCount(values.size());
        task.setDownloadContent(csv);
        task.setOperatorId(UserContextHolder.get() == null ? null : UserContextHolder.get().getId());
        task.setCreateTime(now);
        exportTaskDao.insert(task);
        return toExportVO(task);
    }

    private MessageAdminRecordFilter filter(MessageRecordPageReq req) {
        MessageRecordPageReq safe = req == null ? new MessageRecordPageReq() : req;
        if (safe.getStartTime() != null && safe.getEndTime() != null
                && safe.getStartTime().isAfter(safe.getEndTime())) {
            throw new BusinessException(4001, "开始时间不能晚于结束时间");
        }
        MessageAdminRecordFilter filter = new MessageAdminRecordFilter();
        filter.setKeyword(trim(safe.getKeyword()));
        filter.setRecordType(trim(safe.getRecordType()));
        filter.setMessageType(trim(safe.getMessageType()));
        filter.setSystemCategory(trim(safe.getSystemCategory()));
        filter.setStatus(trim(safe.getStatus()));
        filter.setStartTime(safe.getStartTime());
        filter.setEndTime(safe.getEndTime());
        return filter;
    }

    private AdminMessageRecordVO toListVO(MessageAdminRecordProjection value) {
        AdminMessageRecordVO vo = new AdminMessageRecordVO();
        vo.setRecordNo(value.getRecordNo());
        vo.setRecordType(value.getRecordType());
        vo.setUserMask(mask(value.getUserId()));
        vo.setPeerMask(mask(value.getPeerUserId()));
        vo.setMessageType(value.getMessageType());
        vo.setSystemCategory(value.getSystemCategory());
        vo.setStatus(value.getStatus());
        vo.setCreatedTime(value.getBusinessTime());
        vo.setCaseCount(zero(value.getCaseCount()));
        return vo;
    }

    private AdminMessageRecordDetailVO toDetailVO(MessageAdminRecordProjection value) {
        AdminMessageRecordDetailVO vo = new AdminMessageRecordDetailVO();
        vo.setRecordNo(value.getRecordNo());
        vo.setRecordType(value.getRecordType());
        vo.setUserMask(mask(value.getUserId()));
        vo.setPeerMask(mask(value.getPeerUserId()));
        vo.setMessageType(value.getMessageType());
        vo.setSystemCategory(value.getSystemCategory());
        vo.setStatus(value.getStatus());
        vo.setCreatedTime(value.getBusinessTime());
        vo.setConversationNo(value.getConversationNo());
        vo.setSourceBizNo(value.getSourceBizNo());
        vo.setTimMessageId(value.getTimMessageId());
        vo.setTimMsgKey(value.getTimMsgKey());
        vo.setFailureCode(value.getFailureCode());
        vo.setFailureReason(value.getFailureReason());
        vo.setContentClearedAt(value.getContentClearedAt());
        vo.setCaseCount(zero(value.getCaseCount()));
        return vo;
    }

    private String buildCsv(List<MessageAdminRecordProjection> values) {
        StringBuilder csv = new StringBuilder("\uFEFFrecordNo,recordType,userMask,peerMask,messageType,systemCategory,status,businessTime,conversationNo,sourceBizNo,timMessageId,timMsgKey,failureCode,failureReason,contentClearedAt,caseCount\r\n");
        for (MessageAdminRecordProjection value : values) {
            csv.append(row(value)).append("\r\n");
        }
        return csv.toString();
    }

    private String row(MessageAdminRecordProjection value) {
        return String.join(",",
                csv(value.getRecordNo()), csv(value.getRecordType()), csv(mask(value.getUserId())),
                csv(mask(value.getPeerUserId())), csv(value.getMessageType()),
                csv(value.getSystemCategory()), csv(value.getStatus()), csv(value.getBusinessTime()),
                csv(value.getConversationNo()), csv(value.getSourceBizNo()), csv(value.getTimMessageId()),
                csv(value.getTimMsgKey()), csv(value.getFailureCode()), csv(value.getFailureReason()),
                csv(value.getContentClearedAt()), csv(zero(value.getCaseCount())));
    }

    private String csv(Object value) {
        if (value == null) return "";
        String text = String.valueOf(value).replace("\"", "\"\"");
        return "\"" + text + "\"";
    }

    private String filterSummary(MessageRecordPageReq req) {
        return "keyword=" + empty(req.getKeyword()) + ";recordType=" + empty(req.getRecordType())
                + ";messageType=" + empty(req.getMessageType()) + ";systemCategory="
                + empty(req.getSystemCategory()) + ";status=" + empty(req.getStatus())
                + ";startTime=" + empty(req.getStartTime()) + ";endTime=" + empty(req.getEndTime());
    }

    private ExportTaskVO toExportVO(AppUserExportTask task) {
        ExportTaskVO vo = new ExportTaskVO();
        vo.setTaskNo(task.getTaskNo());
        vo.setExportType(task.getExportType());
        vo.setStatus(task.getStatus());
        vo.setMessage(task.getMessage());
        vo.setFilterSummary(task.getFilterSummary());
        vo.setFileName(task.getFileName());
        vo.setRowCount(task.getRowCount());
        vo.setDownloadContent(task.getDownloadContent());
        vo.setCreateTime(task.getCreateTime());
        return vo;
    }

    private String mask(Long userId) {
        if (userId == null) return null;
        String value = String.format(Locale.ROOT, "%012d", userId);
        return "USR-********" + value.substring(value.length() - 4);
    }

    private Long zero(Long value) {
        return value == null ? 0L : value;
    }

    private String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String empty(Object value) {
        return value == null ? "ALL" : String.valueOf(value);
    }
}
