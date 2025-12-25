package com.aeroguardmobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import com.aeroguardmobile.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URL

class AeroGuardWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        // Fetch air quality data
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val data = fetchAirQualityData()
                val views = RemoteViews(context.packageName, R.layout.widget_small)
                
                // Update AQI value
                views.setTextViewText(R.id.aqi_value, data.aqi.toString())
                
                // Update status
                views.setTextViewText(R.id.status_badge, data.status)
                
                // Set background color based on AQI
                val color = getAQIColor(data.aqi)
                views.setInt(R.id.widget_background, "setBackgroundColor", color)
                
                // Set click intent to open app
                val intent = Intent(context, com.aeroguardmobile.MainActivity::class.java)
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_background, pendingIntent)
                
                // Update widget
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun fetchAirQualityData(): AirQualityData {
        try {
            val url = URL("https://api.waqi.info/feed/here/?token=YOUR_TOKEN")
            val connection = url.openConnection()
            val response = connection.getInputStream().bufferedReader().use { it.readText() }
            val json = JSONObject(response)
            val data = json.getJSONObject("data")
            
            val aqi = data.getInt("aqi")
            val status = getAQIStatus(aqi)
            
            return AirQualityData(aqi, status)
        } catch (e: Exception) {
            return AirQualityData(42, "İyi")
        }
    }

    private fun getAQIStatus(aqi: Int): String {
        return when (aqi) {
            in 0..50 -> "İYİ"
            in 51..100 -> "ORTA"
            in 101..150 -> "HASSAS"
            in 151..200 -> "SAĞLIKSIZ"
            in 201..300 -> "ÇOK SAĞLIKSIZ"
            else -> "TEHLİKELİ"
        }
    }

    private fun getAQIColor(aqi: Int): Int {
        return when (aqi) {
            in 0..50 -> Color.rgb(16, 185, 129)
            in 51..100 -> Color.rgb(234, 179, 8)
            in 101..150 -> Color.rgb(249, 115, 22)
            in 151..200 -> Color.rgb(239, 68, 68)
            in 201..300 -> Color.rgb(168, 85, 247)
            else -> Color.rgb(136, 19, 55)
        }
    }

    data class AirQualityData(val aqi: Int, val status: String)
}
