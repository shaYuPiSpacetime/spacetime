package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CommunityCoverTicketReq {
    @NotBlank private String fileName;
    @Positive private Long fileSizeBytes;
    @NotBlank private String contentType;
}
