package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.GlobalSendSwitchReq;
import com.spacetime.admin.dto.request.MessageConfigPublishReq;
import com.spacetime.admin.dto.request.MessageTemplatePageReq;
import com.spacetime.admin.dto.request.MessageTemplatePublishReq;
import com.spacetime.admin.dto.response.MessageConfigVO;
import com.spacetime.admin.dto.response.MessageRuntimeControlVO;
import com.spacetime.admin.dto.response.MessageTemplateVO;
import com.spacetime.admin.dto.response.ContentOperationLogVO;
import com.spacetime.common.dto.PageReq;

/** 消息规则、运行时开关和模板后台服务。 */
public interface MessageConfigAdminService {
    MessageConfigVO getConfig();
    MessageConfigVO publishVersion(MessageConfigPublishReq req);
    MessageRuntimeControlVO updateGlobalSend(GlobalSendSwitchReq req);
    Page<ContentOperationLogVO> logs(PageReq req);
    Page<MessageTemplateVO> templates(MessageTemplatePageReq req);
    MessageTemplateVO publishTemplate(String templateCode, MessageTemplatePublishReq req);
}
