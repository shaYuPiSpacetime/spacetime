package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 关于我页面回显。 */
@Data
public class AboutMeDetailVO {
    private List<AboutMeQuestionVO> questions;
}
