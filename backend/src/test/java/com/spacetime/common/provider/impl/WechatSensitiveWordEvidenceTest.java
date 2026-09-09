package com.spacetime.common.provider.impl;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.community.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
/** L3-10/21: local evidence is private, valid JSON. */
class WechatSensitiveWordEvidenceTest {
    @Test void localEvidenceIsJsonAndNeverBecomesRejectReason() throws Exception {
        String evidence=new ObjectMapper().writeValueAsString(java.util.Map.of("source","local-sensitive-word","word","test","revision",4));
        var result=WechatProviderResultMapper.map(new CommunitySecurityResult(CommunitySecurityConclusion.REJECT,
            "local_sensitive_word:2","local_sensitive_word_hit",evidence));
        assertThat(result.getSafe()).isFalse();assertThat(result.getProviderCode()).isEqualTo("local-sensitive-word");
        assertThat(result.getRejectReason()).isEqualTo("local_sensitive_word_hit");
        var raw=new ObjectMapper().readTree(result.getRawResponseJson());
        assertThat(raw.path("evidence")).isEqualTo(new ObjectMapper().readTree(evidence));
    }
    @Test void allControlCharactersRemainValidJson() throws Exception {
        String detail="a"+(char)10+(char)9+(char)0+(char)92+(char)34;
        var result=WechatProviderResultMapper.map(CommunitySecurityResult.review(detail));
        assertThat(new ObjectMapper().readTree(result.getRawResponseJson()).path("detail").asText()).isEqualTo(detail);
    }
}
