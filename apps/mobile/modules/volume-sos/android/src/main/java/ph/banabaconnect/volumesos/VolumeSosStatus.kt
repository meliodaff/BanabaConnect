package ph.banabaconnect.volumesos

import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.text.TextUtils

/** Shared by the app's module and both services, which run in different processes. */
internal object VolumeSosStatus {
  /** Whether the resident has turned the service on in Settings, then Accessibility. */
  fun isEnabled(context: Context): Boolean {
    val enabled = Settings.Secure.getString(
      context.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false
    val ours = ComponentName(context, VolumeSosService::class.java)
    val services = TextUtils.SimpleStringSplitter(':').apply { setString(enabled) }
    return services.any { ComponentName.unflattenFromString(it) == ours }
  }
}
