package com.sprintmasasi.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;

/** Arama motoru dosyaları, oda sayfalarında noindex ve güvenlik başlıkları (fikstür: test/resources/static/index.html). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "SM_GOOGLE_SITE_VERIFICATION=abc_123-XYZ")
class SiteAndHeadersTest {

    @LocalServerPort
    int port;

    @Autowired
    TestRestTemplate http;

    private String base() {
        return "http://localhost:" + port;
    }

    @Test
    void homePageGetsAbsoluteUrlsAndVerificationButNoNoindex() {
        var res = http.getForEntity("/", String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody())
                .contains("<link rel=\"canonical\" href=\"" + base() + "/\" />")
                .contains("<meta name=\"google-site-verification\" content=\"abc_123-XYZ\" />")
                .doesNotContain("__SITE_URL__").doesNotContain("noindex");
        assertThat(res.getHeaders().getCacheControl()).isEqualTo("no-cache");
    }

    @Test
    void roomPagesAreNoindex() {
        var res = http.getForEntity("/r/ABCD2345", String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).contains("<meta name=\"robots\" content=\"noindex, nofollow\" />");
        assertThat(res.getHeaders().getFirst("X-Robots-Tag")).isEqualTo("noindex, nofollow");
    }

    @Test
    void robotsAndSitemapPointAtThisSite() {
        assertThat(http.getForObject("/robots.txt", String.class))
                .contains("Disallow: /api/").contains("Sitemap: " + base() + "/sitemap.xml");
        assertThat(http.getForObject("/sitemap.xml", String.class)).contains("<loc>" + base() + "/</loc>");
    }

    @Test
    void securityHeadersAreOnEveryResponse() {
        var res = http.getForEntity("/api/rooms/ABCD2345", String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        var headers = res.getHeaders();
        assertThat(headers.getFirst("Content-Security-Policy"))
                .contains("script-src 'self'").contains("font-src 'self' data:")
                .contains("frame-ancestors 'none'")
                .contains("connect-src 'self' ws://localhost:" + port);
        assertThat(headers.getFirst("X-Frame-Options")).isEqualTo("DENY");
        assertThat(headers.getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(headers.getFirst("Strict-Transport-Security")).isNull(); // http üzerinde gönderilmez
    }
}
