package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 当前已渲染批次可提交的系统消息编号。 */
@Data
public class SystemMessageReadAckVO {
    private List<String> noticeNos;
}
