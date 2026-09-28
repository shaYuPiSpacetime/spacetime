package com.spacetime.website.controller;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.website.auth.WebsiteSessionInterceptor;
import com.spacetime.website.service.WebsiteService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/** 官网活动客户端 API，按网站独立 Cookie 会话鉴权。 */
@RestController
@RequestMapping("/website")
@RequiredArgsConstructor
public class WebsiteController {
    private final WebsiteService service;

    public record PhoneRequest(String phone) {}
    public record ChatRequest(Long activityId, Long peerId) {}

    @GetMapping("/legal/{type}")
    public R<WebsiteService.LegalView> legal(@PathVariable String type) { return R.ok(service.legal(type)); }

    @PostMapping("/auth/sms-code")
    public R<Void> sendCode(@RequestBody PhoneRequest request) {
        service.sendCode(request == null ? null : request.phone());
        return R.ok();
    }

    @PostMapping("/auth/login")
    public R<WebsiteService.SessionView> login(@RequestBody WebsiteService.LoginRequest request,
                                                HttpServletRequest httpRequest, HttpServletResponse response) {
        WebsiteService.LoginSession session = service.login(request);
        response.addHeader("Set-Cookie", cookie(session.token(), Duration.ofDays(7), httpRequest).toString());
        response.setHeader("Cache-Control", "no-store");
        return R.ok(new WebsiteService.SessionView(session.user(), session.csrfToken()));
    }

    @GetMapping("/auth/me")
    public R<WebsiteService.SessionView> me(HttpServletRequest request) {
        return R.ok(new WebsiteService.SessionView(service.me(currentUserId()),
                (String) request.getAttribute("websiteCsrf")));
    }

    @PostMapping("/auth/logout")
    public R<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        service.logout((String) request.getAttribute("websiteToken"));
        response.addHeader("Set-Cookie", cookie("", Duration.ZERO, request).toString());
        return R.ok();
    }

    @GetMapping("/activities")
    public R<List<WebsiteService.ActivityView>> activities(@RequestParam(defaultValue = "1") int page,
                                                            @RequestParam(defaultValue = "20") int size) {
        return R.ok(service.activities(page, size));
    }

    @GetMapping("/activities/{id}")
    public R<WebsiteService.ActivityView> activity(@PathVariable Long id) { return R.ok(service.activity(id, null)); }

    @GetMapping("/me/activities")
    public R<List<WebsiteService.ActivityView>> myActivities() { return R.ok(service.myActivities(currentUserId())); }

    @GetMapping("/me/activities/{id}")
    public R<WebsiteService.ActivityView> myActivity(@PathVariable Long id) {
        return R.ok(service.activity(id, currentUserId()));
    }

    @PostMapping("/activities")
    public R<WebsiteService.ActivityView> publish(@RequestBody WebsiteService.ActivityCreateRequest request) {
        return R.ok(service.publish(currentUserId(), request));
    }

    @PostMapping("/activities/{id}/registrations")
    public R<WebsiteService.RegistrationView> register(@PathVariable Long id) {
        return R.ok(service.register(currentUserId(), id));
    }

    @GetMapping("/me/registrations")
    public R<List<WebsiteService.RegistrationView>> myRegistrations() {
        return R.ok(service.myRegistrations(currentUserId()));
    }

    @GetMapping("/activities/{id}/participants")
    public R<List<WebsiteService.UserView>> participants(@PathVariable Long id) {
        return R.ok(service.participants(currentUserId(), id));
    }

    @PostMapping("/conversations")
    public R<WebsiteService.ConversationView> startConversation(@RequestBody ChatRequest request) {
        if (request == null) throw new BusinessException("请选择活动和私聊对象");
        return R.ok(service.startConversation(currentUserId(), request.activityId(), request.peerId()));
    }

    @GetMapping("/conversations")
    public R<List<WebsiteService.ConversationView>> conversations() {
        return R.ok(service.conversations(currentUserId()));
    }

    @GetMapping("/conversations/{id}/messages")
    public R<List<WebsiteService.MessageView>> messages(@PathVariable Long id) {
        return R.ok(service.messages(currentUserId(), id));
    }

    @PostMapping("/conversations/{id}/messages")
    public R<WebsiteService.MessageView> sendMessage(@PathVariable Long id,
                                                      @RequestBody WebsiteService.MessageCreateRequest request) {
        return R.ok(service.sendMessage(currentUserId(), id, request));
    }

    @PostMapping("/media")
    public R<WebsiteService.MediaUploadView> upload(@RequestParam("file") MultipartFile file) {
        return R.ok(service.upload(currentUserId(), file));
    }

    @GetMapping("/public-media/{id}")
    public ResponseEntity<byte[]> publicMedia(@PathVariable Long id) {
        WebsiteService.PublicMediaView media = service.publicMedia(id);
        return imageResponse(media);
    }

    @GetMapping("/private-media/{id}")
    public ResponseEntity<byte[]> privateMedia(@PathVariable Long id) {
        return imageResponse(service.privateMedia(currentUserId(), id));
    }

    private ResponseEntity<byte[]> imageResponse(WebsiteService.PublicMediaView media) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_TYPE, media.contentType())
                .body(media.bytes());
    }

    @PostMapping("/reports")
    public R<Map<String, Long>> report(@RequestBody WebsiteService.ReportRequest request) {
        return R.ok(Map.of("id", service.report(currentUserId(), request)));
    }

    @PostMapping("/reports/public")
    public R<Map<String, Long>> publicReport(@RequestBody WebsiteService.PublicReportRequest request) {
        return R.ok(Map.of("id", service.publicReport(request)));
    }

    private Long currentUserId() {
        UserContext user = UserContextHolder.get();
        if (user == null || user.getId() == null) throw new BusinessException(401, "请先登录");
        return user.getId();
    }

    private ResponseCookie cookie(String value, Duration age, HttpServletRequest request) {
        boolean secure = request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
        return ResponseCookie.from(WebsiteSessionInterceptor.COOKIE_NAME, value)
                .httpOnly(true).secure(secure).sameSite("Lax").path("/").maxAge(age).build();
    }
}
