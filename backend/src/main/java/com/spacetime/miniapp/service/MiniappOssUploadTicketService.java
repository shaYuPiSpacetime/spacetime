package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.OssUploadTicketVO;

/** 小程序 OSS 直传凭证服务。 */
public interface MiniappOssUploadTicketService {
    OssUploadTicketVO createAvatarTicket(String fileName, long fileSizeBytes);
    OssUploadTicketVO createEducationTicket(String fileName, long fileSizeBytes);
    OssUploadTicketVO createAlbumTicket(String fileName, long fileSizeBytes);
    OssUploadTicketVO createBackgroundTicket(String fileName, long fileSizeBytes);
    OssUploadTicketVO createVoiceTicket(String fileName, long fileSizeBytes);
    OssUploadTicketVO createReportEvidenceTicket(String fileName, long fileSizeBytes);
}
