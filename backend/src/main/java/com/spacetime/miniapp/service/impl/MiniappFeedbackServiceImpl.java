package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppUserFeedbackDao;
import com.spacetime.common.entity.AppUserFeedback;
import com.spacetime.common.enums.FeedbackStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.MiniappFeedbackSubmitReq;
import com.spacetime.miniapp.service.MiniappFeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MiniappFeedbackServiceImpl implements MiniappFeedbackService {
    private final AppUserFeedbackDao feedbackDao;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public Long submit(Long userId, MiniappFeedbackSubmitReq req) {
        if (!StringUtils.hasText(req.getContent())) {
            throw new BusinessException("反馈内容不能为空");
        }
        List<String> imageUrls = req.getImageUrls() == null ? List.of() : req.getImageUrls();
        if (imageUrls.size() > 9) {
            throw new BusinessException("反馈截图最多9张");
        }
        for (String url : imageUrls) {
            if (!StringUtils.hasText(url) || !(url.startsWith("http://") || url.startsWith("https://"))) {
                throw new BusinessException("反馈截图地址不合法");
            }
        }
        AppUserFeedback entity = new AppUserFeedback();
        entity.setUserId(userId);
        entity.setFeedbackType(req.getFeedbackType());
        entity.setContent(req.getContent().trim());
        entity.setImageUrls(toJson(imageUrls));
        entity.setContact(req.getContact());
        entity.setStatus(FeedbackStatusEnum.PENDING.getCode());
        feedbackDao.insert(entity);
        return entity.getId();
    }

    private String toJson(List<String> imageUrls) {
        try {
            return objectMapper.writeValueAsString(imageUrls);
        } catch (JsonProcessingException e) {
            throw new BusinessException("反馈截图解析失败");
        }
    }
}
