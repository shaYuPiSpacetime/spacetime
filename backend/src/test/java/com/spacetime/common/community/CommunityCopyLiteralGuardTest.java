package com.spacetime.common.community;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/** 社区可见文案必须来自 COMMUNITY_COPY，禁止在服务实现中写死中文。 */
class CommunityCopyLiteralGuardTest {
    private static final Pattern BLOCK_COMMENT = Pattern.compile("/\\*.*?\\*/", Pattern.DOTALL);
    private static final Pattern CHINESE_LITERAL = Pattern.compile("\"[^\"\\n]*[\\u4e00-\\u9fff][^\"\\n]*\"");

    @Test
    void communityServices_shouldNotContainChineseStringLiterals() throws Exception {
        List<Path> files = List.of(
                Path.of("src/main/java/com/spacetime/miniapp/service/impl/CommunityServiceImpl.java"),
                Path.of("src/main/java/com/spacetime/admin/service/impl/CommunityAdminServiceImpl.java"),
                Path.of("src/main/java/com/spacetime/common/community/UnavailableChatReportContextResolver.java"),
                Path.of("src/main/java/com/spacetime/miniapp/service/impl/MiniappOssUploadTicketServiceImpl.java")
        );
        List<String> violations = new ArrayList<>();
        for (Path file : files) {
            String source = BLOCK_COMMENT.matcher(Files.readString(file)).replaceAll("");
            String[] lines = source.split("\\R");
            for (int index = 0; index < lines.length; index++) {
                String code = lines[index].replaceFirst("//.*$", "");
                Matcher matcher = CHINESE_LITERAL.matcher(code);
                while (matcher.find()) violations.add(file.getFileName() + ":" + (index + 1) + " " + matcher.group());
            }
        }
        assertThat(violations).as("社区 ServiceImpl 的业务文案必须从 COMMUNITY_COPY 读取").isEmpty();
    }
}
