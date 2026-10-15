package com.anonym239.kotlanaos;

import android.Manifest;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {

  private static final int PORT = 8645;
  private static final String OLLAMA = "http://127.0.0.1:11434";

  private WebServer server;
  private WebView web;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Mikrofon/Kamera für die Webcam-Funktion (optional) anfragen
    try {
      requestPermissions(new String[]{ Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA }, 1);
    } catch (Exception ignored) {}

    // Eingebauten Server starten (liefert das Spiel + Ollama-Proxy)
    try {
      server = new WebServer(PORT, getAssets(), OLLAMA);
      server.start(NanoTimeouts.READ_TIMEOUT, false);
    } catch (Exception e) {
      Toast.makeText(this, "Server-Start fehlgeschlagen: " + e.getMessage(), Toast.LENGTH_LONG).show();
    }

    web = new WebView(this);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);                 // localStorage (Einstellungen, Gedächtnis)
    s.setMediaPlaybackRequiresUserGesture(false); // Sounds dürfen ohne extra Tipp starten
    s.setAllowFileAccess(false);
    s.setCacheMode(WebSettings.LOAD_NO_CACHE);

    // Kamera/Mikro-Anfragen der Webseite im WebView erlauben
    web.setWebChromeClient(new WebChromeClient() {
      @Override
      public void onPermissionRequest(final PermissionRequest request) {
        runOnUiThread(() -> request.grant(request.getResources()));
      }
    });
    web.setWebViewClient(new WebViewClient());

    setContentView(web);
    web.loadUrl("http://127.0.0.1:" + PORT + "/");
  }

  // Zurück-Taste: im Spiel zurück navigieren, statt die App zu schließen
  @Override
  public void onBackPressed() {
    if (web != null && web.canGoBack()) web.goBack();
    else super.onBackPressed();
  }

  @Override
  protected void onDestroy() {
    if (server != null) server.stop();
    super.onDestroy();
  }

  // Kleiner Helfer, damit der Lesetimeout klar benannt ist
  static final class NanoTimeouts {
    static final int READ_TIMEOUT = 10000;
  }
}
