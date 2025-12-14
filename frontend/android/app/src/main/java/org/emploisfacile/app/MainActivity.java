package org.emploisfacile.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ⚡ Patch important pour l'affichage mobile Capacitor
        WebSettings settings = getBridge().getWebView().getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);

        settings.setUseWideViewPort(true);          // Active le viewport mobile réel
        settings.setLoadWithOverviewMode(true);     // Adapte l'écran au mobile

        settings.setSupportZoom(false);             // Pas de zoom inutile
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
    }
}