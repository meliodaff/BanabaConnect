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

// Five presses of volume down within this window, like Android's own power-button emergency SOS.
// One button only: pressing up and down quickly overlaps the two keys, which many phones treat as a
// key combination (a bug report or the accessibility shortcut) before this service sees the keys.
private const val PRESSES = 5
private const val WINDOW_MS = 3_000L
// After opening the SOS screen, a second burst within this time only buzzes, so one long panicked
// burst opens the screen once.
private const val COOLDOWN_MS = 3_000L
// Same link as the widget and the app icon shortcut (app.json "scheme").
private const val SOS_URL = "banabaconnect://sos"

/**
 * Watches the volume buttons for the SOS pattern and opens the app's SOS screen, where the phone's
 * lock still confirms the send. Turned on by the resident in Settings, then Accessibility.
 *
 * It never consumes a key, so the volume still changes as usual. Android only passes keys to it
 * while the screen is on (the lock screen counts); with the screen off they go straight to the
 * volume or the media player.
 *
 * Runs in its own process (":volumesos", see AndroidManifest.xml), so it must not use anything
 * that lives in the app's process, such as the JavaScript side.
 */
class VolumeSosService : AccessibilityService() {
  private val presses = ArrayDeque<Long>()
  private var lastOpenedAt = 0L

  override fun onKeyEvent(event: KeyEvent): Boolean {
    val key = event.keyCode
    if (key != KeyEvent.KEYCODE_VOLUME_UP && key != KeyEvent.KEYCODE_VOLUME_DOWN) return false
    // One entry per press: holding a button repeats ACTION_DOWN.
    if (event.action != KeyEvent.ACTION_DOWN || event.repeatCount > 0) return false
    // Volume up in between means the resident is just adjusting the volume.
    if (key == KeyEvent.KEYCODE_VOLUME_UP) {
      presses.clear()
      return false
    }

    val now = SystemClock.uptimeMillis()
    presses.addLast(now)
    while (presses.isNotEmpty() && now - presses.first() > WINDOW_MS) presses.removeFirst()

    if (presses.size >= PRESSES) {
      presses.clear()
      // Always buzz, so the resident knows the pattern was caught even if SOS is already open.
      buzz()
      if (now - lastOpenedAt > COOLDOWN_MS) {
        lastOpenedAt = now
        openSos()
      }
    }
    return false
  }

  private fun openSos() {
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

  override fun onServiceConnected() {
    super.onServiceConnected()
    VolumeSosReadyService.start(this)
  }

  /** Turned off in Settings: the ready notification goes too. */
  override fun onUnbind(intent: Intent?): Boolean {
    VolumeSosReadyService.stop(this)
    return super.onUnbind(intent)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

  override fun onInterrupt() = Unit
}
