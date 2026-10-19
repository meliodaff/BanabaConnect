package ph.banabaconnect.volumesos

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import android.text.TextUtils
import android.view.accessibility.AccessibilityManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Lets the app show whether volume-button SOS is on, and open the screen that turns it on. */
class VolumeSosModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("VolumeSos")

    /** Whether the resident has turned the service on in Settings, then Accessibility. */
    Function("isEnabled") {
      val enabled = Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
      ) ?: return@Function false
      val ours = ComponentName(context, VolumeSosService::class.java)
      val services = TextUtils.SimpleStringSplitter(':').apply { setString(enabled) }
      services.any { ComponentName.unflattenFromString(it) == ours }
    }

    /**
     * Whether the service is actually running. It can be on in Settings but stopped, for example
     * after Stop in the phone's Active apps list, and Android doesn't start it again by itself.
     */
    Function("isRunning") {
      val manager = context.getSystemService(AccessibilityManager::class.java)
        ?: return@Function true
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

    /** Whether battery saving leaves the app alone, so the phone doesn't stop the service. */
    Function("isIgnoringBatteryOptimizations") {
      val power = context.getSystemService(PowerManager::class.java)
      power?.isIgnoringBatteryOptimizations(context.packageName) ?: true
    }

    /** The battery list where the resident lets BanabaConnect run in the background. */
    Function("openBatterySettings") {
      try {
        context.startActivity(
          Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
      } catch (error: ActivityNotFoundException) {
        // Some phones hide that list; App info has a Battery entry instead.
        context.startActivity(
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
      }
    }
  }
}
