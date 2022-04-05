package com.github.bhollier.minesweeper;

import android.annotation.SuppressLint;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;

import android.content.res.AssetManager;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/**
 * An example full-screen activity that shows and hides the system UI (i.e.
 * status bar and navigation/system bar) with user interaction.
 */
public class WebActivity extends AppCompatActivity {
    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_web);

        // Hide the action bar
        ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) {
            actionBar.hide();
        }

        // Get the web view
        WebView webView = findViewById(R.id.web_view);
        // Enable JS
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);

        // Add a custom web view client for local web assets
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view, WebResourceRequest req) {
                String path = req.getUrl().getPath().substring(1);

                try {
                    String mime;
                    AssetManager assetManager = getAssets();

                    if (path.endsWith(".html")) mime = "text/html";
                    else if (path.endsWith(".wasm")) mime = "application/wasm";
                    else if (path.endsWith(".js")) mime = "text/javascript";
                    else if (path.endsWith(".png")) mime = "image/png";
                    else return super.shouldInterceptRequest(view, req);

                    InputStream input = assetManager.open("www/" + path);

                    return new WebResourceResponse(mime, "utf-8", input);

                } catch (IOException e) {
                    e.printStackTrace();
                    ByteArrayInputStream result = new ByteArrayInputStream(
                            ("URL: " + path + ", Error: " + e.toString()).getBytes());
                    return new WebResourceResponse(
                            "text/plain", "utf-8", result);
                }
            }
        });

        // Set the URL
        webView.loadUrl("https://appassets.androidplatform.net/index.html");
    }
}