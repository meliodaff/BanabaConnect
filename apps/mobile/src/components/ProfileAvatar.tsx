import { useState } from 'react';
import { Image, StyleSheet, View, type ColorValue } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { SkeletonBlock, SkeletonGroup } from '@/components/Skeleton';
import { radius, useTheme } from '@/theme';

/**
 * The resident's photo from their Google account, in a circle. Falls back to the person icon
 * for guests, email accounts, or when the photo can't load (e.g. no signal).
 * Shows a skeleton while the account is still loading or the photo is still downloading.
 */
export function ProfileAvatar({
  uri,
  size,
  iconSize,
  backgroundColor,
  loading = false,
}: {
  uri: string | null;
  size: number;
  iconSize: number;
  backgroundColor: ColorValue;
  /** True while the account is still loading, so it isn't known yet whether there's a photo. */
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const showPhoto = !loading && uri !== null && uri !== failedUri;
  const skeleton = loading || (showPhoto && uri !== loadedUri);
  const circle = { width: size, height: size, borderRadius: radius.pill };

  return (
    <View
      style={[
        circle,
        {
          // The tint is close to the skeleton's gray, so leave it off while the skeleton shows.
          backgroundColor: skeleton ? 'transparent' : backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
      ]}
    >
      {showPhoto ? (
        <Image
          source={{ uri }}
          style={circle}
          onLoad={() => setLoadedUri(uri)}
          onError={() => setFailedUri(uri)}
          accessibilityLabel="Your profile photo"
        />
      ) : (
        !loading && <Icon name={icons.profile} size={iconSize} color={colors.primary} />
      )}
      {skeleton && (
        <SkeletonGroup style={StyleSheet.absoluteFill}>
          <SkeletonBlock width={size} height={size} radius={radius.pill} />
        </SkeletonGroup>
      )}
    </View>
  );
}
