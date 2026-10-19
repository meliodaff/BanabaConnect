package ph.banabaconnect.volumesos

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.util.Log

private const val CHANNEL_ID = "volume_sos_ready"
private const val NOTIFICATION_ID = 911
// Tapping the notification opens the Profile tab, where the feature is turned on and off.
private const val PROFILE_URL = "banabaconnect://profile"

/**
 * The silent "Volume-button SOS is ready" notification. While it shows, Android treats the
 * service's process as in use, so phones that kill apps swiped away from recent apps (Xiaomi, for
 * one) are much less likely to stop volume-button SOS too. Same process as VolumeSosService.
 *
 * Android only lets an app start this while it is on screen, or in a few other cases, so it is
 * started both when the accessibility service connects and whenever the app comes to the front.
 */
class VolumeSosReadyService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    try {
      // Always first: a service started with startForegroundService must call this in time.
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(NOTIFICATION_ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(NOTIFICATION_ID, notification())
      }
    } catch (error: Exception) {
      // Android didn't allow it right now (the app is in the background). The next time the app
      // comes to the front it tries again.
      Log.w("VolumeSos", "Could not show the ready notification", error)
      stopSelf()
      return START_NOT_STICKY
    }
    // Turned off in Settings while the app wasn't running.
    if (!VolumeSosStatus.isEnabled(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    // If the phone stops it anyway, Android may restart it, which also starts the process the
    // accessibility service needs.
    return START_STICKY
  }

  private fun notification(): Notification {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(
          CHANNEL_ID,
          getString(R.string.volume_sos_channel),
          NotificationManager.IMPORTANCE_LOW
        ).apply {
          description = getString(R.string.volume_sos_channel_description)
          setShowBadge(false)
        }
      )
    }
    val openProfile = PendingIntent.getActivity(
      this,
      0,
      Intent(Intent.ACTION_VIEW, Uri.parse(PROFILE_URL)).setPackage(packageName),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this).setPriority(Notification.PRIORITY_LOW)
    }
    return builder
      .setSmallIcon(R.drawable.volume_sos_notification)
      .setContentTitle(getString(R.string.volume_sos_ready_title))
      .setContentText(getString(R.string.volume_sos_ready_text))
      .setContentIntent(openProfile)
      .setOngoing(true)
      .setShowWhen(false)
      .build()
  }

  companion object {
    /** Shows the notification if volume-button SOS is on. Safe to call any time. */
    fun start(context: Context) {
      if (!VolumeSosStatus.isEnabled(context)) return
      val intent = Intent(context, VolumeSosReadyService::class.java)
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
      } catch (error: Exception) {
        // Not allowed from the background on Android 12 and later; tried again from the app.
        Log.w("VolumeSos", "Could not start the ready notification", error)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, VolumeSosReadyService::class.java))
    }
  }
}
