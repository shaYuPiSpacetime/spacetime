package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.util.OssUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/**
 * 文件访问控制器 —— 通过后端代理返回 OSS 文件 URL（302 重定向）。
 *
 * <h3>两类文件</h3>
 * <ul>
 *   <li><b>公有文件（人像/头像/相册）</b>：走 CDN 永久短链，无需登录态</li>
 *   <li><b>凭证文件（身份证/学历照）</b>：走 OSS 签名临时 URL，需登录态，默认 5 分钟有效</li>
 * </ul>
 *
 * <p>前端只需要存 Key，访问时拼 `/miniapp/file/public/{key}` 或 `/miniapp/file/credential/{key}`，
 * 无需关心实际 URL 的签名细节。</p>
 */
@RestController
@RequestMapping("/miniapp/file")
@RequiredArgsConstructor
public class FileController {

    private final OssUtil ossUtil;

    /**
     * 访问公有文件（人像照片、头像等），302 重定向到 CDN 永久短链。
     *
     * @param request  HTTP 请求（用于提取文件 Key）
     * @param response HTTP 响应
     */
    @GetMapping("/public/**")
    public void publicFile(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String key = extractKey(request, "/miniapp/file/public/");
        response.sendRedirect(ossUtil.toCdnUrl(key));
    }

    /**
     * 访问凭证文件（身份证、学历照等敏感文件），需登录态，302 重定向到 OSS 签名临时 URL。
     *
     * @param request  HTTP 请求（用于提取文件 Key）
     * @param response HTTP 响应
     */
    @GetMapping("/credential/**")
    public void credentialFile(HttpServletRequest request, HttpServletResponse response) throws IOException {
        requireLogin();
        String key = extractKey(request, "/miniapp/file/credential/");
        response.sendRedirect(ossUtil.toSignedUrl(key));
    }

    // ==================== 内部方法 ====================

    /**
     * 从请求 URI 中提取 OSS Key。
     * 例如请求 /miniapp/file/public/2025/07/08/uuid.jpg → 2025/07/08/uuid.jpg
     */
    private String extractKey(HttpServletRequest request, String prefix) {
        String uri = request.getRequestURI();
        int idx = uri.indexOf(prefix);
        if (idx < 0) {
            throw new BusinessException("文件路径不合法");
        }
        return uri.substring(idx + prefix.length());
    }

    /**
     * 校验登录态，未登录抛出 401。
     */
    private void requireLogin() {
        UserContext ctx = UserContextHolder.get();
        if (ctx == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
    }
}
