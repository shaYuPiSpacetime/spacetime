package com.spacetime.website;

import com.spacetime.common.dao.WebsiteDao;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.LocalSensitiveWordService;
import com.spacetime.common.util.OssUtil;
import com.spacetime.common.website.WebsiteData;
import com.spacetime.website.service.impl.WebsiteServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.spacetime.common.provider.SmsCodeProvider;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebsiteServiceImplTest {
    @Mock WebsiteDao dao;
    @Mock StringRedisTemplate redis;
    @Mock SmsCodeProvider sms;
    @Mock LocalSensitiveWordService sensitiveWords;
    @Mock OssUtil oss;
    @InjectMocks WebsiteServiceImpl service;

    private WebsiteData.User user(Long id) {
        WebsiteData.User value = new WebsiteData.User();
        value.setId(id); value.setStatus("ACTIVE"); value.setPhone("13800000000"); value.setNickname("活动用户");
        return value;
    }

    private WebsiteData.Activity activity(String status) {
        WebsiteData.Activity value = new WebsiteData.Activity();
        value.setId(10L); value.setAuthorId(1L); value.setTitle("校园骑行"); value.setContent("周末集合");
        value.setLocation("大学城南门"); value.setStartTime(LocalDateTime.now().plusDays(2));
        value.setEstimatedCost(new BigDecimal("12.50")); value.setStatus(status);
        return value;
    }

    @Test void 待审核活动只允许发布者查看且图片不向公众公开() {
        WebsiteData.Activity pending = activity("PENDING");
        WebsiteData.Media media = new WebsiteData.Media();
        media.setId(5L); media.setStatus("PENDING"); media.setObjectKey("website/1/photo.jpg");
        when(dao.activity(10L)).thenReturn(pending);
        when(dao.user(1L)).thenReturn(user(1L));
        when(dao.mediaFor("ACTIVITY", 10L)).thenReturn(List.of(media));
        assertThrows(BusinessException.class, () -> service.activity(10L, null));
        assertEquals(1, service.activity(10L, 1L).images().size());
        pending.setStatus("APPROVED");
        assertTrue(service.activity(10L, null).images().isEmpty());
    }

    @Test void 免费报名重复请求不插入新记录() {
        WebsiteData.Registration registration = new WebsiteData.Registration();
        registration.setId(12L); registration.setStatus("REGISTERED");
        when(dao.user(2L)).thenReturn(user(2L));
        when(dao.user(1L)).thenReturn(user(1L));
        when(dao.activity(10L)).thenReturn(activity("APPROVED"));
        when(dao.registration(10L, 2L)).thenReturn(registration);
        assertEquals(12L, service.register(2L, 10L).id());
        verify(dao, never()).insertRegistration(any());
    }

    @Test void 待审核图片消息只对发送者显示() {
        WebsiteData.Conversation conversation = new WebsiteData.Conversation();
        conversation.setId(3L); conversation.setActivityId(10L); conversation.setUserLowId(1L); conversation.setUserHighId(2L);
        WebsiteData.Message pending = new WebsiteData.Message();
        pending.setId(4L); pending.setSenderId(1L); pending.setConversationId(3L);
        pending.setMessageType("IMAGE"); pending.setMediaId(5L); pending.setStatus("PENDING");
        WebsiteData.Media media = new WebsiteData.Media(); media.setId(5L); media.setObjectKey("website/1/photo.jpg");
        when(dao.conversation(3L)).thenReturn(conversation);
        when(dao.messages(3L)).thenReturn(List.of(pending));
        when(dao.media(5L)).thenReturn(media);
        assertEquals(1, service.messages(1L, 3L).size());
        assertTrue(service.messages(2L, 3L).isEmpty());
    }

    @Test void 举报必须指定有效对象编号() {
        when(dao.user(2L)).thenReturn(user(2L));
        assertThrows(BusinessException.class, () -> service.report(2L,
                new com.spacetime.website.service.WebsiteService.ReportRequest("ACTIVITY", null, "存在不良内容")));
        verify(dao, never()).insertReport(any());
    }

    @Test void 聊天图片不进入公开接口且待审核时仅发送者可读取() {
        WebsiteData.Media media = new WebsiteData.Media();
        media.setId(5L); media.setOwnerId(1L); media.setObjectKey("website/1/photo.jpg");
        media.setTargetType("MESSAGE"); media.setTargetId(4L); media.setStatus("PENDING");
        WebsiteData.Message message = new WebsiteData.Message();
        message.setId(4L); message.setMediaId(5L); message.setConversationId(3L);
        message.setSenderId(1L); message.setStatus("PENDING");
        WebsiteData.Conversation conversation = new WebsiteData.Conversation();
        conversation.setId(3L); conversation.setUserLowId(1L); conversation.setUserHighId(2L);
        when(dao.media(5L)).thenReturn(media);
        when(dao.message(4L)).thenReturn(message);
        when(dao.conversation(3L)).thenReturn(conversation);
        when(dao.user(1L)).thenReturn(user(1L));
        when(dao.user(2L)).thenReturn(user(2L));
        when(oss.readWebsiteObject(media.getObjectKey(), 5 * 1024 * 1024)).thenReturn(new byte[]{1});
        assertThrows(BusinessException.class, () -> service.publicMedia(5L));
        assertArrayEquals(new byte[]{1}, service.privateMedia(1L, 5L).bytes());
        assertThrows(BusinessException.class, () -> service.privateMedia(2L, 5L));
        message.setStatus("APPROVED"); media.setStatus("APPROVED");
        assertArrayEquals(new byte[]{1}, service.privateMedia(2L, 5L).bytes());
    }
}
