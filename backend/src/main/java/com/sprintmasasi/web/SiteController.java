package com.sprintmasasi.web;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/**
 * Arama motorları ve link önizlemeleri için sayfa iskeleti.
 * - index.html'deki __SITE_URL__ gerçek adresle değişir (og:image gibi alanlar mutlak adres ister).
 * - Oda sayfaları (/r/KOD) "noindex": oda linkleri Google'a girmez.
 * - robots.txt ve sitemap.xml adres sabit yazılmadan üretilir; alan adı değişince ayar gerekmez.
 * SM_PUBLIC_URL tanımlıysa (ör. kendi alan adı) adres her zaman odur.
 * SM_GOOGLE_SITE_VERIFICATION tanımlıysa Search Console doğrulama etiketi eklenir.
 */
@RestController
public class SiteController {

    private static final String SITE_URL = "__SITE_URL__";
    private static final String HEAD_MARKER = "<!--sm:head-->";
    private static final Pattern SAFE_URL = Pattern.compile("https?://[A-Za-z0-9.\\-]+(:[0-9]{1,5})?");
    private static final Pattern SAFE_TOKEN = Pattern.compile("[A-Za-z0-9_\\-]{1,100}");

    private final String publicUrl;
    private final String googleVerification;
    private volatile String template;

    public SiteController(@Value("${SM_PUBLIC_URL:}") String publicUrl,
                          @Value("${SM_GOOGLE_SITE_VERIFICATION:}") String googleVerification) {
        String url = publicUrl.strip().replaceAll("/+$", "");
        this.publicUrl = SAFE_URL.matcher(url).matches() ? url : "";
        String token = googleVerification.strip();
        this.googleVerification = SAFE_TOKEN.matcher(token).matches() ? token : "";
    }

    @GetMapping({"/", "/index.html", "/yeni"})
    public ResponseEntity<String> home(HttpServletRequest request) throws IOException {
        return page(request, false);
    }

    @GetMapping("/r/{code}")
    public ResponseEntity<String> room(@PathVariable String code, HttpServletRequest request) throws IOException {
        return page(request, true);
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public String robots() {
        return """
                User-agent: *
                Allow: /
                Disallow: /api/
                Disallow: /admin/
                Disallow: /ws

                Sitemap: %s/sitemap.xml
                """.formatted(siteUrl());
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public String sitemap() {
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                  <url><loc>%s/</loc></url>
                </urlset>
                """.formatted(siteUrl());
    }

    private ResponseEntity<String> page(HttpServletRequest request, boolean noindex) throws IOException {
        String html = template();
        if (html == null) {
            return ResponseEntity.notFound().build(); // frontend derlenmemiş (backend testleri)
        }
        var head = new StringBuilder();
        if (noindex) {
            head.append("<meta name=\"robots\" content=\"noindex, nofollow\" />");
        }
        if (!googleVerification.isEmpty()) {
            head.append("<meta name=\"google-site-verification\" content=\"").append(googleVerification).append("\" />");
        }
        String body = html.replace(SITE_URL, siteUrl()).replace(HEAD_MARKER, head.toString());
        var response = ResponseEntity.ok()
                .contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8))
                .cacheControl(CacheControl.noCache());
        if (noindex) {
            response.header("X-Robots-Tag", "noindex, nofollow");
        }
        return response.body(body);
    }

    /** Sitenin kök adresi, sonda "/" olmadan. Ters vekil arkasında forward-headers ayarı gerçek adresi verir. */
    private String siteUrl() {
        if (!publicUrl.isEmpty()) {
            return publicUrl;
        }
        String url = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
        return SAFE_URL.matcher(url).matches() ? url : "";
    }

    private String template() throws IOException {
        String t = template;
        if (t == null) {
            var resource = new ClassPathResource("static/index.html");
            if (!resource.exists()) {
                return null;
            }
            try (InputStream in = resource.getInputStream()) {
                t = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            }
            template = t;
        }
        return t;
    }
}
