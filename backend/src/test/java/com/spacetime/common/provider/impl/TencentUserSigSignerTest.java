package com.spacetime.common.provider.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.zip.Inflater;

import static org.assertj.core.api.Assertions.assertThat;

class TencentUserSigSignerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldGenerateTencentCompatibleUserSig() throws Exception {
        TencentUserSigSigner signer = new TencentUserSigSigner(objectMapper);

        String userSig = signer.generate(1400000001L, "tu_Test_01", "unit-test-secret", 86400L,
                1_786_276_800L);

        JsonNode payload = objectMapper.readTree(inflate(userSig));
        assertThat(payload.path("TLS.ver").asText()).isEqualTo("2.0");
        assertThat(payload.path("TLS.identifier").asText()).isEqualTo("tu_Test_01");
        assertThat(payload.path("TLS.sdkappid").asLong()).isEqualTo(1400000001L);
        assertThat(payload.path("TLS.time").asLong()).isEqualTo(1_786_276_800L);
        assertThat(payload.path("TLS.expire").asLong()).isEqualTo(86400L);

        String signedContent = "TLS.identifier:tu_Test_01\n"
                + "TLS.sdkappid:1400000001\n"
                + "TLS.time:1786276800\n"
                + "TLS.expire:86400\n";
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("unit-test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        assertThat(payload.path("TLS.sig").asText())
                .isEqualTo(Base64.getEncoder().encodeToString(mac.doFinal(
                        signedContent.getBytes(StandardCharsets.UTF_8))));
    }

    private String inflate(String userSig) throws Exception {
        String base64 = userSig.replace('*', '+').replace('-', '/').replace('_', '=');
        byte[] compressed = Base64.getDecoder().decode(base64);
        Inflater inflater = new Inflater();
        inflater.setInput(compressed);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[512];
        while (!inflater.finished()) {
            int count = inflater.inflate(buffer);
            if (count == 0 && inflater.needsInput()) {
                break;
            }
            output.write(buffer, 0, count);
        }
        inflater.end();
        return output.toString(StandardCharsets.UTF_8);
    }
}
