import { AccessoryWidgetBackground, Circle, Image, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  multilineTextAlignment,
  shadow,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

/**
 * Home-screen and Lock Screen SOS widget: one round red button, like an emergency button. Tapping
 * it opens banabaconnect://sos, where the phone's lock confirms the send. It shows no data, so it
 * never needs updating.
 *
 * iPhone widgets can't be see-through, so the button sits on a plain tile: a white ring with a soft
 * shadow, so it reads as a raised button, around a red disc that is lighter at the top.
 *
 * The 'widget' function is serialized into the widget extension: it may only use @expo/ui
 * components and modifiers, with every value written inline (no outside constants). Keep comments
 * out of its body, since it is copied into the widget as source text.
 */
const SosWidget = (_props: object, environment: WidgetEnvironment) => {
  'widget';
  if (environment.widgetFamily === 'accessoryCircular') {
    return (
      <ZStack modifiers={[widgetURL('banabaconnect://sos')]}>
        <AccessoryWidgetBackground />
        <Image systemName="sos" size={26} />
      </ZStack>
    );
  }
  return (
    <ZStack
      modifiers={[
        containerBackground(environment.colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF', 'widget'),
        widgetURL('banabaconnect://sos'),
      ]}
    >
      <Circle
        modifiers={[
          foregroundStyle('#FFFFFF'),
          frame({ width: 128, height: 128 }),
          shadow({ radius: 6, y: 3, color: '#00000040' }),
        ]}
      />
      <Circle
        modifiers={[
          foregroundStyle({
            type: 'linearGradient',
            colors: ['#E53935', '#B71C1C'],
            startPoint: { x: 0.5, y: 0 },
            endPoint: { x: 0.5, y: 1 },
          }),
          frame({ width: 114, height: 114 }),
        ]}
      />
      <VStack spacing={2}>
        <Text modifiers={[font({ size: 36, weight: 'heavy' }), foregroundStyle('#FFFFFF')]}>SOS</Text>
        <Text
          modifiers={[
            font({ size: 12, weight: 'bold' }),
            foregroundStyle('#FFFFFF'),
            multilineTextAlignment('center'),
            frame({ width: 86 }),
          ]}
        >
          Humingi ng tulong
        </Text>
      </VStack>
    </ZStack>
  );
};

const widget = createWidget('SosWidget', SosWidget);

// Give the widget its (only) entry, so it draws as soon as it is added.
widget.updateSnapshot({});

export default widget;
