package ph.banabaconnect.volumesos

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
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

    /** Apps can't turn an accessibility service on themselves; the resident does it here. */
    Function("openSettings") {
      context.startActivity(
        Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }
  }
}
