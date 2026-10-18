import { createElement } from 'react';
import { registerWidgetTaskHandler, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { SosAndroidWidget } from './SosAndroidWidget';

/**
 * Draws the SOS widget whenever Android asks, including after a resize, since the circle is sized
 * to the widget. Its tap opens a link, so no click handling here.
 */
async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetInfo.widgetName !== 'SosWidget' || widgetAction === 'WIDGET_DELETED') return;
  renderWidget(createElement(SosAndroidWidget, { width: widgetInfo.width, height: widgetInfo.height }));
}

registerWidgetTaskHandler(widgetTaskHandler);
