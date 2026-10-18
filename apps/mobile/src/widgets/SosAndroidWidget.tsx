import { FlexWidget, TextWidget } from 'react-native-android-widget';

/**
 * Android home-screen SOS widget: one round red button, like an emergency button, on a clear
 * background. Tapping it opens banabaconnect://sos, where the phone's lock confirms the send.
 * Colors are fixed: the widget draws outside the app's theme.
 *
 * `width` and `height` are the widget's size in dp (from the task handler), so the button stays a
 * circle at any size the resident resizes it to.
 */
export function SosAndroidWidget({ width = 110, height = 110 }: { width?: number; height?: number }) {
  // Leave a little room so the ring isn't clipped at the cell edge.
  const size = Math.max(64, Math.floor(Math.min(width, height) - 8));
  // A white ring keeps the button visible on dark and red wallpapers; the thin dark edge keeps it
  // visible on white ones.
  const ring = Math.max(4, Math.round(size * 0.06));
  const inner = size - ring * 2;
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'banabaconnect://sos' }}
        accessibilityLabel="SOS. Tap to ask Barangay Banaba for help."
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.18)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <FlexWidget
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            // Lighter at the top, darker at the bottom: reads as a raised button to press.
            backgroundGradient: { from: '#E53935', to: '#B71C1C', orientation: 'TOP_BOTTOM' },
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: Math.round(inner * 0.1),
          }}
        >
          <TextWidget
            text="SOS"
            style={{ fontSize: Math.round(inner * 0.3), fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 }}
          />
          <TextWidget
            text="Humingi ng tulong"
            maxLines={2}
            style={{
              fontSize: Math.min(15, Math.max(11, Math.round(inner * 0.095))),
              fontWeight: '700',
              color: '#FFFFFF',
              textAlign: 'center',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
