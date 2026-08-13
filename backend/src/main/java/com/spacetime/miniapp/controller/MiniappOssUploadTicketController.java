package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.OssUploadTicketReq;
import com.spacetime.miniapp.dto.response.OssUploadTicketVO;
import com.spacetime.miniapp.service.MiniappOssUploadTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 小程序 OSS 直传短时凭证接口。 */
@RestController
@RequestMapping("/miniapp/file/upload-ticket")
@RequiredArgsConstructor
public class MiniappOssUploadTicketController {
    private final MiniappOssUploadTicketService uploadTicketService;

    @PostMapping("/avatar")
    public R<OssUploadTicketVO> avatar(@Valid @RequestBody OssUploadTicketReq req) {
        return R.ok(uploadTicketService.createAvatarTicket(req.getFileName(), req.getFileSizeBytes()));
    }

    @PostMapping("/education")
    public R<OssUploadTicketVO> education(@Valid @RequestBody OssUploadTicketReq req) {
        return R.ok(uploadTicketService.createEducationTicket(req.getFileName(), req.getFileSizeBytes()));
    }

    @PostMapping("/album")
    public R<OssUploadTicketVO> album(@Valid @RequestBody OssUploadTicketReq req) {
        return R.ok(uploadTicketService.createAlbumTicket(req.getFileName(), req.getFileSizeBytes()));
    }

    @PostMapping("/background")
    public R<OssUploadTicketVO> background(@Valid @RequestBody OssUploadTicketReq req) {
        return R.ok(uploadTicketService.createBackgroundTicket(req.getFileName(), req.getFileSizeBytes()));
    }

    @PostMapping("/voice")
    public R<OssUploadTicketVO> voice(@Valid @RequestBody OssUploadTicketReq req) {
        return R.ok(uploadTicketService.createVoiceTicket(req.getFileName(), req.getFileSizeBytes()));
    }

    @PostMapping("/report-evidence")
    public R<OssUploadTicketVO> reportEvidence(@Valid @RequestBody OssUploadTicketReq req) {
        return R.ok(uploadTicketService.createReportEvidenceTicket(req.getFileName(), req.getFileSizeBytes()));
    }
}
