package org.emploisfacile.app;

import android.os.Bundle;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        /*
         🔥 FIX DÉFINITIF SAMSUNG / ANDROID
         Empêche le WebView de dessiner sous :
         - la status bar (haut)
         - la navigation bar (bas)
        */
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        /*
         🎨 Optionnel mais recommandé :
         Couleur cohérente avec ton thème sombre
        */
        getWindow().setStatusBarColor(0xFF020617);
        getWindow().setNavigationBarColor(0xFF020617);
    }
}
