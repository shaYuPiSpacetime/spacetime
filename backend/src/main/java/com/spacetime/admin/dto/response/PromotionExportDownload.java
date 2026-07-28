package com.spacetime.admin.dto.response;

/**
 * 推广导出文件下载结果。
 */
public record PromotionExportDownload(String fileName, byte[] content) {
}
