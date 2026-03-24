import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, PanResponder, PanResponderInstance, Platform } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const OPEN_EDGE_START_X = SCREEN_W * 0.55;

export function useInlinePeek() {
  const [peekVisible, setPeekVisible] = useState(false);
  const [peekUsed, setPeekUsed] = useState(false);
  const peekVisibleRef = useRef(false);
  const gestureIntentRef = useRef<'open' | 'close' | null>(null);
  const webUserSelectRef = useRef<string | null>(null);
  const webWebkitUserSelectRef = useRef<string | null>(null);

  useEffect(() => {
    peekVisibleRef.current = peekVisible;
  }, [peekVisible]);

  const showPeek = useCallback(() => {
    peekVisibleRef.current = true;
    setPeekVisible(true);
    setPeekUsed(true);
  }, []);

  const hidePeek = useCallback(() => {
    peekVisibleRef.current = false;
    setPeekVisible(false);
  }, []);

  const togglePeek = useCallback(() => {
    if (peekVisibleRef.current) {
      hidePeek();
    } else {
      showPeek();
    }
  }, [hidePeek, showPeek]);

  const resetPeek = useCallback(() => {
    peekVisibleRef.current = false;
    setPeekVisible(false);
    setPeekUsed(false);
  }, []);

  const setWebSelectionDisabled = useCallback((disabled: boolean) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    if (disabled) {
      if (webUserSelectRef.current === null) {
        webUserSelectRef.current = document.body.style.userSelect;
        webWebkitUserSelectRef.current = document.body.style.webkitUserSelect;
      }
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      return;
    }

    if (webUserSelectRef.current !== null) {
      document.body.style.userSelect = webUserSelectRef.current;
      webUserSelectRef.current = null;
    }
    if (webWebkitUserSelectRef.current !== null) {
      document.body.style.webkitUserSelect = webWebkitUserSelectRef.current;
      webWebkitUserSelectRef.current = null;
    }
  }, []);

  useEffect(() => () => setWebSelectionDisabled(false), [setWebSelectionDisabled]);

  const panResponder = useRef<PanResponderInstance | null>(null);
  if (!panResponder.current) {
    const shouldSetPanResponder = (_: unknown, gestureState: { dx: number; dy: number; x0: number }) => {
      const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);

      if (!isHorizontal || Math.abs(gestureState.dx) <= 18) {
        gestureIntentRef.current = null;
        return false;
      }

      if (!peekVisibleRef.current) {
        const canOpen = gestureState.x0 >= OPEN_EDGE_START_X && gestureState.dx < 0;
        gestureIntentRef.current = canOpen ? 'open' : null;
        return canOpen;
      }

      const canClose = gestureState.dx > 0;
      gestureIntentRef.current = canClose ? 'close' : null;
      return canClose;
    };

    panResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: (event) => {
        // Don't claim on start, but proactively kill text selection
        // on web when the touch begins in the swipe zone so the browser
        // doesn't start selecting during the first few px of drag.
        if (Platform.OS === 'web') {
          const startX = (event.nativeEvent as any).pageX ?? 0;
          if (startX >= OPEN_EDGE_START_X || peekVisibleRef.current) {
            setWebSelectionDisabled(true);
            // If the user taps without dragging, release/terminate won't
            // fire (we return false). Restore selection after a short delay
            // — if a real drag starts, onPanResponderGrant will re-disable.
            setTimeout(() => setWebSelectionDisabled(false), 300);
          }
        }
        return false;
      },
      onMoveShouldSetPanResponder: shouldSetPanResponder,
      onMoveShouldSetPanResponderCapture: shouldSetPanResponder,
      onPanResponderGrant: () => {
        setWebSelectionDisabled(true);
        // Clear any accidental selection that snuck through
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.getSelection()?.removeAllRanges();
        }
      },
      onPanResponderTerminate: () => {
        gestureIntentRef.current = null;
        setWebSelectionDisabled(false);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureIntentRef.current === 'open' && gestureState.dx < -70) {
          showPeek();
          gestureIntentRef.current = null;
          setWebSelectionDisabled(false);
          return;
        }

        if (gestureIntentRef.current === 'close' && gestureState.dx > 70 && peekVisibleRef.current) {
          hidePeek();
        }

        gestureIntentRef.current = null;
        setWebSelectionDisabled(false);
      },
    });
  }

  return {
    peekVisible,
    peekUsed,
    showPeek,
    hidePeek,
    togglePeek,
    resetPeek,
    panHandlers: panResponder.current.panHandlers,
  };
}