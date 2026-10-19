package ph.banabaconnect.volumesos

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Xiaomi, Redmi and POCO (MIUI and HyperOS): without Autostart, the phone doesn't let Android restart
// the service after the app is swiped away from recent apps.
private val XIAOMI_AUTOSTART = ComponentName(
  "com.miui.securitycenter",
  "com.miui.permcenter.autostart.AutoStartManagementActivity"
)

/** Lets the app show whether volume-button SOS is on, and open the screens that turn it on. */
class VolumeSosModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("VolumeSos")

    /** Whether the resident has turned the service on in Settings, then Accessibility. */
    Function("isEnabled") {
      VolumeSosStatus.isEnabled(context)
    }

    /**
     * Shows the "Volume-button SOS is ready" notification if the feature is on. Called whenever
     * the app comes to the front: Android doesn't let the service start it from the background.
     */
    Function("keepReady") {
      VolumeSosReadyService.start(context)
    }

    /**
     * Whether the service is actually running. It can be on in Settings but stopped: some phones
     * kill it when the app is swiped away and don't let Android start it again.
     */
    Function("isRunning") {
      val manager = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
      val ours = ComponentName(context, VolumeSosService::class.java)
      // Android lists only the services it is connected to here.
      manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK).any {
        ComponentName.unflattenFromString(it.id) == ours
      }
    }

    /** Apps can't turn an accessibility service on themselves; the resident does it here. */
    Function("openSettings") {
      context.startActivity(
        Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    /** Whether this phone has Xiaomi's Autostart screen (see openBackgroundSettings). */
    Function("hasAutostart") {
      Intent().setComponent(XIAOMI_AUTOSTART).resolveActivity(context.packageManager) != null
    }

    /**
     * Opens the screen that lets the service keep running: Xiaomi's Autostart list where there is
     * one, otherwise App info, where Battery is.
     */
    Function("openBackgroundSettings") {
      val autostart = Intent().setComponent(XIAOMI_AUTOSTART).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(autostart)
      } catch (error: Exception) {
        context.startActivity(
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
      }
    }
  }
}
