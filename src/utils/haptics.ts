/**
 * Tactile Haptic Feedback Utility
 * Provides native-like vibrations on iOS, Android, and mobile Web.
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

export async function triggerHaptic(style: HapticStyle = 'light'): Promise<void> {
  // 1. Capacitor native haptics
  try {
    const cap = typeof window !== 'undefined'
      ? (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      : undefined;

    if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      if (style === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (style === 'warning') {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (style === 'heavy') {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (style === 'medium') {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
      return;
    }
  } catch {
    // Ignore Capacitor errors
  }

  // 2. Web Vibration API fallback (Android mobile browser / PWA)
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (style === 'light') {
        navigator.vibrate(10);
      } else if (style === 'medium') {
        navigator.vibrate(25);
      } else if (style === 'heavy') {
        navigator.vibrate(40);
      } else if (style === 'success') {
        navigator.vibrate([15, 30, 25]);
      }
    }
  } catch {
    // Ignore vibration errors
  }
}
