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
        assertThat(http.getForObject("/sitemap.xml", String.class))
                .contains("<loc>" + base() + "/</loc>")
                .contains("<loc>" + base() + "/en</loc>")
                .contains("<loc>" + base() + "/gizlilik</loc>")
                .contains("hreflang=\"en\" href=\"" + base() + "/en/privacy\"");
    }

    @Test
    void englishHomeHasOwnMetaCanonicalAndBootContent() {
        var res = http.getForEntity("/en", String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).contains("<html lang=\"en\">").contains("<title>Title EN</title>")
                .contains("href=\"" + base() + "/en\"").contains("en_US").contains("<h1>Hello</h1>")
                .doesNotContain("__").doesNotContain("noindex");
        assertThat(http.getForEntity("/en/", String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(http.getForObject("/", String.class)).contains("<html lang=\"tr\">").contains("<h1>Merhaba</h1>");
    }

    @Test
    void contentPagesAreServedWithAbsoluteUrls() {
        var res = http.getForEntity("/en/privacy", String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).contains(base() + "/en/privacy").doesNotContain("__SITE_URL__");
        assertThat(http.getForEntity("/gizlilik", String.class).getBody()).contains("gizlilik");
        assertThat(http.getForEntity("/story-point-nedir", String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void newRoomPageIsNoindex() {
        var res = http.getForEntity("/yeni", String.class);
        assertThat(res.getHeaders().getFirst("X-Robots-Tag")).isEqualTo("noindex, nofollow");
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

    @Test
    void textResponsesAreCompressed() {
        var headers = new org.springframework.http.HttpHeaders();
        headers.set("Accept-Encoding", "gzip");
        var res = http.exchange("/sitemap.xml", org.springframework.http.HttpMethod.GET,
                new org.springframework.http.HttpEntity<>(headers), byte[].class);
        assertThat(res.getHeaders().getFirst("Content-Encoding")).isEqualTo("gzip");
    }
}
