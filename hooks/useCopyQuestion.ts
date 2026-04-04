import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';

/**
 * Shared hook for tap-to-copy question text.
 * Returns `onCopy` handler and `copiedVisible` flag that auto-clears after ~1s.
 */
export function useCopyQuestion(text: string) {
  const [copiedVisible, setCopiedVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCopy = useCallback(() => {
    if (!text) return;
    Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopiedVisible(false), 1000);
  }, [text]);

  return { onCopy, copiedVisible };
}
