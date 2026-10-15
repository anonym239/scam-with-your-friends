package com.anonym239.kotlanaos;

import android.content.res.AssetManager;

import java.io.ByteArrayInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

import fi.iki.elonen.NanoHTTPD;

/**
 * Kleiner lokaler HTTP-Server in der App.
 *  - liefert die Spiel-Dateien aus assets/web/ aus
 *  - leitet /ollama/* an die Ollama-App auf dem Handy weiter (127.0.0.1:11434)
 * Dadurch ist die Seite same-origin mit dem Proxy, und es gibt kein CORS-Problem –
 * genau wie der server.js auf dem PC.
 */
public class WebServer extends NanoHTTPD {

  private final AssetManager assets;
  private final String ollamaBase;

  public WebServer(int port, AssetManager assets, String ollamaBase) {
    super("127.0.0.1", port);
    this.assets = assets;
    this.ollamaBase = ollamaBase;
  }

  @Override
  public Response serve(IHTTPSession session) {
    String uri = session.getUri();
    try {
      if (uri.startsWith("/ollama/")) {
        return proxy(session, uri.substring("/ollama".length()));
      }
      return asset(uri);
    } catch (Exception e) {
      return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain; charset=utf-8",
          "Fehler: " + e.getMessage());
    }
  }

  private Response asset(String uri) {
    String path = uri;
    if (path.equals("/") || path.isEmpty()) path = "/index.html";
    if (path.endsWith("/")) path += "index.html";
    String assetPath = "web" + path;
    try {
      InputStream in = assets.open(assetPath);
      return newChunkedResponse(Response.Status.OK, mime(path), in);
    } catch (IOException e) {
      return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain; charset=utf-8", "Nicht gefunden");
    }
  }

  private Response proxy(IHTTPSession session, String path) throws IOException {
    Method m = session.getMethod();
    byte[] body = (m == Method.POST || m == Method.PUT || m == Method.PATCH) ? readBody(session) : null;

    // Ziel-Adressen in Reihenfolge probieren: vom Header (Einstellung), dann übliche Loopback-Adressen.
    java.util.LinkedHashSet<String> bases = new java.util.LinkedHashSet<>();
    String header = session.getHeaders().get("x-ollama-base");
    if (header != null && header.startsWith("http")) bases.add(header.replaceAll("/+$", ""));
    bases.add(ollamaBase);
    bases.add("http://127.0.0.1:11434");
    bases.add("http://localhost:11434");
    bases.add("http://[::1]:11434");

    IOException last = null;
    for (String b : bases) {
      try {
        HttpURLConnection con = (HttpURLConnection) new URL(b + path).openConnection();
        con.setRequestMethod(m.name());
        con.setConnectTimeout(4000);
        con.setReadTimeout(0); // Streaming-Antworten dürfen lange dauern
        con.setRequestProperty("Content-Type", "application/json");
        if (body != null) {
          con.setDoOutput(true);
          OutputStream os = con.getOutputStream();
          os.write(body);
          os.flush();
          os.close();
        }
        int code = con.getResponseCode(); // wirft bei Verbindungsfehler -> nächste Adresse
        InputStream in = code >= 400 ? con.getErrorStream() : con.getInputStream();
        if (in == null) in = new ByteArrayInputStream(new byte[0]);
        String ct = con.getContentType();
        if (ct == null) ct = "application/json";
        return newChunkedResponse(status(code), ct, in);
      } catch (IOException e) {
        last = e; // nächste Adresse versuchen
      }
    }
    String msg = last == null ? "unbekannt" : last.getMessage();
    return newFixedLengthResponse(status(502), "application/json",
        "{\"error\":\"Ollama nicht erreichbar (" + esc(msg) + "). Läuft die Ollama-App und hört sie auf Port 11434? Adresse ggf. in den Einstellungen anpassen.\"}");
  }

  private static String esc(String s) {
    if (s == null) return "";
    return s.replace("\\", "\\\\").replace("\"", "'").replace("\n", " ");
  }

  private byte[] readBody(IHTTPSession s) throws IOException {
    String cl = s.getHeaders().get("content-length");
    int len = 0;
    if (cl != null) {
      try { len = Integer.parseInt(cl.trim()); } catch (NumberFormatException ignored) {}
    }
    byte[] buf = new byte[len];
    InputStream in = s.getInputStream();
    int off = 0;
    while (off < len) {
      int r = in.read(buf, off, len - off);
      if (r < 0) break;
      off += r;
    }
    return buf;
  }

  private static Response.IStatus status(final int code) {
    return new Response.IStatus() {
      @Override public String getDescription() { return String.valueOf(code); }
      @Override public int getRequestStatus() { return code; }
    };
  }

  private static String mime(String path) {
    String p = path.toLowerCase();
    if (p.endsWith(".html")) return "text/html; charset=utf-8";
    if (p.endsWith(".js")) return "text/javascript; charset=utf-8";
    if (p.endsWith(".css")) return "text/css; charset=utf-8";
    if (p.endsWith(".json")) return "application/json; charset=utf-8";
    if (p.endsWith(".svg")) return "image/svg+xml";
    if (p.endsWith(".webp")) return "image/webp";
    if (p.endsWith(".png")) return "image/png";
    if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
    if (p.endsWith(".ico")) return "image/x-icon";
    return "application/octet-stream";
  }
}
