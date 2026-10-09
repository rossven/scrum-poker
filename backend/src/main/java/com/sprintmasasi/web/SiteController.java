package com.sprintmasasi.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
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
 * - Ana sayfa Türkçe (/) ve İngilizce (/en) olarak, derleme sırasında üretilen pages/manifest.json'daki metinlerle sunulur.
 * - Rehber ve gizlilik sayfaları derleme sırasında hazır HTML olarak üretilir (static/pages/), burada yalnızca servis edilir.
 * - Oda sayfaları (/r/KOD) ve /yeni "noindex": oda linkleri Google'a girmez.
 * - robots.txt ve sitemap.xml adres sabit yazılmadan üretilir; alan adı değişince ayar gerekmez.
 * SM_PUBLIC_URL tanımlıysa (ör. kendi alan adı) adres her zaman odur.
 * SM_GOOGLE_SITE_VERIFICATION tanımlıysa Search Console doğrulama etiketi eklenir.
 */
@RestController
public class SiteController {

    private static final String SITE_URL = "__SITE_URL__";
    private static final String HEAD_MARKER = "<!--sm:head-->";
    private static final String BOOT_MARKER = "<!--sm:boot-->";
    private static final Pattern SAFE_URL = Pattern.compile("https?://[A-Za-z0-9.\\-]+(:[0-9]{1,5})?");
    private static final Pattern SAFE_TOKEN = Pattern.compile("[A-Za-z0-9_\\-]{1,100}");
    private static final ObjectMapper JSON = new ObjectMapper();

    /** Derleme çıktısı; yoksa (backend testleri) varsayılan Türkçe metinler kullanılır. */
    private record Manifest(JsonNode root) {
        List<JsonNode> pages() {
            var list = new ArrayList<JsonNode>();
            root.path("pages").forEach(list::add);
            return list;
        }

        JsonNode home(String lang) {
            return root.path("home").path(lang);
        }
    }

    private final String publicUrl;
    private final String googleVerification;
    private volatile String template;
    private volatile Manifest manifest;

    public SiteController(@Value("${SM_PUBLIC_URL:}") String publicUrl,
                          @Value("${SM_GOOGLE_SITE_VERIFICATION:}") String googleVerification) {
        String url = publicUrl.strip().replaceAll("/+$", "");
        this.publicUrl = SAFE_URL.matcher(url).matches() ? url : "";
        String token = googleVerification.strip();
        this.googleVerification = SAFE_TOKEN.matcher(token).matches() ? token : "";
    }

    @GetMapping({"/", "/index.html"})
    public ResponseEntity<String> home(HttpServletRequest request) throws IOException {
        return page(homeValues("tr", "/"), false);
    }

    @GetMapping({"/en", "/en/"})
    public ResponseEntity<String> homeEnglish(HttpServletRequest request) throws IOException {
        return page(homeValues("en", "/en"), false);
    }

    @GetMapping("/yeni")
    public ResponseEntity<String> create(HttpServletRequest request) throws IOException {
        return page(homeValues(langParam(request), "/"), true);
    }

    @GetMapping("/r/{code}")
    public ResponseEntity<String> room(@PathVariable String code, HttpServletRequest request) throws IOException {
        return page(homeValues("tr", "/"), true);
    }

    /** Rehber ve gizlilik sayfaları: manifest'te kayıtlı yollar. */
    @GetMapping({"/planning-poker-nedir", "/story-point-nedir", "/gizlilik",
            "/en/what-is-planning-poker", "/en/story-points-guide", "/en/privacy"})
    public ResponseEntity<String> content(HttpServletRequest request) throws IOException {
        String path = request.getRequestURI();
        for (JsonNode p : manifest().pages()) {
            if (p.path("path").asText().equals(path)) {
                var resource = new ClassPathResource("static/pages/" + p.path("file").asText());
                if (!resource.exists()) {
                    break;
                }
                try (InputStream in = resource.getInputStream()) {
                    String html = new String(in.readAllBytes(), StandardCharsets.UTF_8).replace(SITE_URL, siteUrl());
                    return ResponseEntity.ok()
                            .contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8))
                            .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic())
                            .body(html);
                }
            }
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public String robots() {
        return """
                User-agent: *
                Allow: /
                Disallow: /api/
                Disallow: /admin/
                Disallow: /ws
                Disallow: /pages/

                Sitemap: %s/sitemap.xml
                """.formatted(siteUrl());
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public String sitemap() throws IOException {
        String site = siteUrl();
        // Her adres için karşılığı olan dil sürümü (hreflang) birlikte yazılır.
        var entries = new ArrayList<String[]>(); // path, trPath, enPath
        entries.add(new String[]{"/", "/", "/en"});
        entries.add(new String[]{"/en", "/", "/en"});
        for (JsonNode p : manifest().pages()) {
            String path = p.path("path").asText();
            String alt = p.path("alternate").asText();
            boolean tr = "tr".equals(p.path("lang").asText());
            entries.add(new String[]{path, tr ? path : alt, tr ? alt : path});
        }
        var xml = new StringBuilder("""
                <?xml version="1.0" encoding="UTF-8"?>
                <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
                """);
        for (String[] e : entries) {
            xml.append("  <url><loc>").append(site).append(e[0]).append("</loc>")
                    .append("<xhtml:link rel=\"alternate\" hreflang=\"tr\" href=\"").append(site).append(e[1]).append("\"/>")
                    .append("<xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"").append(site).append(e[2]).append("\"/>")
                    .append("<xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"").append(site).append(e[1]).append("\"/>")
                    .append("</url>\n");
        }
        return xml.append("</urlset>\n").toString();
    }

    /** Sayfa başına değişen alanlar. */
    private record HomeValues(String lang, String canonical, String title, String desc, String ogDesc, String locale, String boot) {}

    private HomeValues homeValues(String lang, String canonical) throws IOException {
        JsonNode h = manifest().home(lang);
        if (h.isMissingNode() || h.isEmpty()) {
            return new HomeValues("tr", canonical, "SprintMasası · Ücretsiz online planning poker",
                    "Ekibinle ücretsiz, hesapsız planning poker (scrum poker) oyna.",
                    "Ekibinle eğlenceli ve adil sprint planlama. Hesap yok, link yeter.", "tr_TR", "");
        }
        return new HomeValues(lang, canonical, h.path("title").asText(), h.path("description").asText(),
                h.path("ogDescription").asText(), h.path("locale").asText(), h.path("boot").asText());
    }

    private static String langParam(HttpServletRequest request) {
        return "en".equals(request.getParameter("lang")) ? "en" : "tr";
    }

    private static String attr(String s) {
        return s.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private ResponseEntity<String> page(HomeValues v, boolean noindex) throws IOException {
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
        String body = html
                .replace("__CANONICAL__", v.canonical().equals("/") ? "/" : v.canonical())
                .replace("__TITLE__", attr(v.title()))
                .replace("__DESC__", attr(v.desc()))
                .replace("__OG_DESC__", attr(v.ogDesc()))
                .replace("__OG_LOCALE__", attr(v.locale()))
                .replace("__LANG__", attr(v.lang()))
                .replace(SITE_URL, siteUrl())
                .replace(BOOT_MARKER, v.boot())
                .replace(HEAD_MARKER, head.toString());
        var response = ResponseEntity.ok()
                .contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8))
                .cacheControl(CacheControl.noCache());
        if (noindex) {
            response.header("X-Robots-Tag", "noindex, nofollow");
        }
        return response.body(body);
    }

    private Manifest manifest() throws IOException {
        Manifest m = manifest;
        if (m == null) {
            var resource = new ClassPathResource("static/pages/manifest.json");
            if (resource.exists()) {
                try (InputStream in = resource.getInputStream()) {
                    m = new Manifest(JSON.readTree(in));
                }
            } else {
                m = new Manifest(JSON.createObjectNode());
            }
            manifest = m;
        }
        return m;
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
