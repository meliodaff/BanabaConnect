package ph.banabaconnect.volumesos

import android.accessibilityservice.AccessibilityService
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
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent

// Five volume-down presses within this window. A volume-up press starts over, so turning the
// volume down a lot and back up doesn't build toward opening the screen.
private const val PRESSES = 5
private const val WINDOW_MS = 3_000L
// After opening the SOS screen, ignore the pattern for a while so one panicked burst opens it once.
private const val COOLDOWN_MS = 10_000L
// Same link as the widget and the app icon shortcut (app.json "scheme").
private const val SOS_URL = "banabaconnect://sos"
private const val CHANNEL_ID = "volume_sos"
private const val NOTIFICATION_ID = 7_110

/**
 * Watches the volume buttons for the SOS pattern and opens the app's SOS screen, where the phone's
 * lock still confirms the send. Turned on by the resident in Settings, then Accessibility.
 *
 * It never consumes a key, so the volume still changes as usual. Android only passes keys to it
 * while the screen is on (the lock screen counts).
 *
 * While on, it runs as a foreground service with a quiet ongoing notification. Android keeps an
 * accessibility service bound after the app is swiped away, but many phone makers kill the process
 * anyway unless it is in the foreground.
 */
class VolumeSosService : AccessibilityService() {
  private val presses = ArrayDeque<Long>()
  private var lastOpenedAt = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(NOTIFICATION_ID, buildNotification())
      }
    } catch (error: Exception) {
      // Still works as a plain accessibility service, just easier for the phone to kill.
      Log.w("VolumeSos", "Could not run in the foreground", error)
    }
  }

  override fun onUnbind(intent: Intent?): Boolean {
    stopForegroundCompat()
    return super.onUnbind(intent)
  }

  override fun onDestroy() {
    stopForegroundCompat()
    super.onDestroy()
  }

  override fun onKeyEvent(event: KeyEvent): Boolean {
    val key = event.keyCode
    if (key != KeyEvent.KEYCODE_VOLUME_UP && key != KeyEvent.KEYCODE_VOLUME_DOWN) return false
    // One entry per press: holding a button repeats ACTION_DOWN.
    if (event.action != KeyEvent.ACTION_DOWN || event.repeatCount > 0) return false

    if (key == KeyEvent.KEYCODE_VOLUME_UP) {
      presses.clear()
      return false
    }
    val now = SystemClock.uptimeMillis()
    presses.addLast(now)
    while (presses.isNotEmpty() && now - presses.first() > WINDOW_MS) presses.removeFirst()

    if (presses.size >= PRESSES) {
      presses.clear()
      if (now - lastOpenedAt > COOLDOWN_MS) {
        lastOpenedAt = now
        openSos()
      }
    }
    return false
  }

  private fun sosIntent() = Intent(Intent.ACTION_VIEW, Uri.parse(SOS_URL))
    .setPackage(packageName)
    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

  private fun openSos() {
    buzz()
    val intent = sosIntent()
    try {
      // Allowed from the background: Android lets a bound accessibility service start activities.
      startActivity(intent)
    } catch (error: Exception) {
      Log.w("VolumeSos", "Could not open the SOS screen", error)
    }
  }

  /** Quiet and ongoing: says the listener is on, and opens Send SOS when tapped. */
  private fun buildNotification(): Notification {
    val tap = PendingIntent.getActivity(
      this, 0, sosIntent(), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID, getString(R.string.volume_sos_channel), NotificationManager.IMPORTANCE_LOW
      ).apply { setShowBadge(false) }
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this).setPriority(Notification.PRIORITY_LOW)
    }
    return builder
      .setSmallIcon(R.drawable.ic_volume_sos)
      .setContentTitle(getString(R.string.volume_sos_notification_title))
      .setContentText(getString(R.string.volume_sos_notification_text))
      .setContentIntent(tap)
      .setOngoing(true)
      .setShowWhen(false)
      .setCategory(Notification.CATEGORY_SERVICE)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .build()
  }

  private fun stopForegroundCompat() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(Service.STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
  }

  /** Two strong pulses: the pattern was caught. On the lock screen, the SOS screen waits behind it. */
  private fun buzz() {
    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    val timings = longArrayOf(0, 250, 120, 250)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(timings, -1))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(timings, -1)
    }
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

  override fun onInterrupt() = Unit
}
