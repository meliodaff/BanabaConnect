import { useCallback, useEffect, useRef } from 'react';
import {
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { registerScroller, registerTarget, reportTap, unregisterTarget } from './tutorialStore';

/**
 * Marks a part of a real screen that the tutorial can point at. It only wraps the child; the
 * child's own buttons keep working as before.
 */
export function TourTarget({
  id,
  style,
  children,
}: {
  id: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const ref = useRef<View>(null);

  useEffect(() => {
    const view = ref.current;
    if (!view) return;
    registerTarget(id, view);
    return () => unregisterTarget(id, view);
  }, [id]);

  return (
    <View ref={ref} collapsable={false} style={style} onTouchEnd={() => reportTap(id)}>
      {children}
    </View>
  );
}

/**
 * Lets the tutorial scroll this screen to a target below the fold. Spread the result onto the
 * screen's ScrollView. `route` is the screen's path, like "/" or "/profile".
 */
export function useTourScroll(route: string) {
  const ref = useRef<ScrollView>(null);
  const offset = useRef(0);

  useEffect(
    () =>
      registerScroller(route, {
        scrollBy: (dy, animated) =>
          ref.current?.scrollTo({ y: Math.max(offset.current + dy, 0), animated }),
      }),
    [route],
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);

  return { ref, onScroll, scrollEventThrottle: 16 };
}
