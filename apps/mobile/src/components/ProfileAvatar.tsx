import { useState } from 'react';
import { Image, View, type ColorValue } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { radius, useTheme } from '@/theme';

/**
 * The resident's photo from their Google account, in a circle. Falls back to the person icon
 * for guests, email accounts, or when the photo can't load (e.g. no signal).
 */
export function ProfileAvatar({
  uri,
  size,
  iconSize,
  backgroundColor,
}: {
  uri: string | null;
  size: number;
  iconSize: number;
  backgroundColor: ColorValue;
}) {
  const { colors } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPhoto = uri !== null && uri !== failedUri;
  const circle = { width: size, height: size, borderRadius: radius.pill };

  return (
    <View
      style={[circle, { backgroundColor, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}
    >
      {showPhoto ? (
        <Image
          source={{ uri }}
          style={circle}
          onError={() => setFailedUri(uri)}
          accessibilityLabel="Your profile photo"
        />
      ) : (
        <Icon name={icons.profile} size={iconSize} color={colors.primary} />
      )}
    </View>
  );
}
