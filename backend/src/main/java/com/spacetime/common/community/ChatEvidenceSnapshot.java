package com.spacetime.common.community;

/** 举报证据冻结结果，不包含正文。 */
public record ChatEvidenceSnapshot(
        String snapshotStatus,
        int evidenceCount,
        String evidenceJson) {
}
