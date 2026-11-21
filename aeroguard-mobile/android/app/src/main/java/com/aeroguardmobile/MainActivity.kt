package com.aeroguardmobile

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar

    // Web uygulamanızın URL'si
    private val webAppUrl = "https://aero-guard.netlify.app"
    private var pendingLocationPermission: Pair<String, GeolocationPermissions.Callback>? = null
    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allowed = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        completeLocationPermission(allowed)
    }

    private fun isAppOrigin(origin: String): Boolean {
        val requested = Uri.parse(origin)
        val expected = Uri.parse(webAppUrl)
        return requested.scheme == "https" && requested.host == expected.host &&
            (requested.port == -1 || requested.port == 443)
    }

    private fun completeLocationPermission(allowed: Boolean) {
        val pending = pendingLocationPermission ?: return
        pendingLocationPermission = null
        pending.second.invoke(pending.first, allowed && isAppOrigin(pending.first), false)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize views
        webView = findViewById(R.id.webView)
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout)
        progressBar = findViewById(R.id.progressBar)

        // Configure WebView
        setupWebView()

        // Configure SwipeRefreshLayout
        setupSwipeRefresh()

        // Handle back button
        onBackPressedDispatcher.addCallback(this, object : androidx.activity.OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        // Load web app
        loadWebApp()
    }

    private fun setupWebView() {
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                swipeRefreshLayout.isRefreshing = false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String, callback: GeolocationPermissions.Callback
            ) {
                if (!isAppOrigin(origin)) {
                    callback.invoke(origin, false, false)
                    return
                }
                completeLocationPermission(false)
                pendingLocationPermission = origin to callback
                val hasLocation = ContextCompat.checkSelfPermission(
                    this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(
                    this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
                if (hasLocation) {
                    completeLocationPermission(true)
                } else {
                    locationPermissionLauncher.launch(arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    ))
                }
            }

            override fun onGeolocationPermissionsHidePrompt() {
                completeLocationPermission(false)
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }
        }

        // WebView settings
        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.databaseEnabled = true
        webSettings.setSupportZoom(true)
        webSettings.builtInZoomControls = true
        webSettings.displayZoomControls = false
        webSettings.loadWithOverviewMode = true
        webSettings.useWideViewPort = true
        webSettings.cacheMode = WebSettings.LOAD_DEFAULT
        webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // Enable geolocation
        webSettings.setGeolocationEnabled(true)
    }

    private fun setupSwipeRefresh() {
        swipeRefreshLayout.setOnRefreshListener {
            webView.reload()
        }
        swipeRefreshLayout.setColorSchemeResources(
            android.R.color.holo_blue_bright,
            android.R.color.holo_green_light,
            android.R.color.holo_orange_light,
            android.R.color.holo_red_light
        )
    }

    private fun loadWebApp() {
        progressBar.visibility = View.VISIBLE
        webView.loadUrl(webAppUrl)
    }

    override fun onDestroy() {
        completeLocationPermission(false)
        webView.destroy()
        super.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webView.restoreState(savedInstanceState)
    }
}
