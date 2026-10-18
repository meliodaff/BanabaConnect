package ph.banabaconnect.volumesos

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent

// Four presses, alternating volume up and down (either one first), within this window.
// Turning the volume up or down never alternates, so it doesn't open the screen by accident.
private const val PRESSES = 4
private const val WINDOW_MS = 2_000L
// After opening the SOS screen, ignore the pattern for a while so one panicked burst opens it once.
private const val COOLDOWN_MS = 10_000L
// Same link as the widget and the app icon shortcut (app.json "scheme").
private const val SOS_URL = "banabaconnect://sos"

/**
 * Watches the volume buttons for the SOS pattern and opens the app's SOS screen, where the phone's
 * lock still confirms the send. Turned on by the resident in Settings, then Accessibility.
 *
 * It never consumes a key, so the volume still changes as usual. Android only passes keys to it
 * while the screen is on (the lock screen counts).
 */
class VolumeSosService : AccessibilityService() {
  private val presses = ArrayDeque<Pair<Int, Long>>()
  private var lastOpenedAt = 0L

  override fun onKeyEvent(event: KeyEvent): Boolean {
    val key = event.keyCode
    if (key != KeyEvent.KEYCODE_VOLUME_UP && key != KeyEvent.KEYCODE_VOLUME_DOWN) return false
    // One entry per press: holding a button repeats ACTION_DOWN.
    if (event.action != KeyEvent.ACTION_DOWN || event.repeatCount > 0) return false

    val now = SystemClock.uptimeMillis()
    // A press that repeats the last button starts a new attempt from this press.
    if (presses.lastOrNull()?.first == key) presses.clear()
    presses.addLast(key to now)
    while (presses.isNotEmpty() && now - presses.first().second > WINDOW_MS) presses.removeFirst()

    if (presses.size >= PRESSES) {
      presses.clear()
      if (now - lastOpenedAt > COOLDOWN_MS) {
        lastOpenedAt = now
        openSos()
      }
    }
    return false
  }

  private fun openSos() {
    buzz()
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(SOS_URL))
      .setPackage(packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      // Allowed from the background: Android lets a bound accessibility service start activities.
      startActivity(intent)
    } catch (error: Exception) {
      Log.w("VolumeSos", "Could not open the SOS screen", error)
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
