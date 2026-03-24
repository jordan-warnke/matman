import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * On web, maps keyboard keys 1-4 / a-d to MC option callbacks,
 * and Enter to an advance callback.
 * Pass `null` for disabled options.
 */
export function useWebShortcuts(
  options: ((() => void) | null)[],
  onEnter?: () => void,
  onInputSubmit?: () => void,
  onInputKey?: (key: string) => void,
  onInputBackspace?: () => void,
  onTabDown?: () => void,
  onTabUp?: () => void,
  onEscape?: () => void,
) {
  const optionsRef = useRef(options);
  const onEnterRef = useRef(onEnter);
  const onInputSubmitRef = useRef(onInputSubmit);
  const onInputKeyRef = useRef(onInputKey);
  const onInputBackspaceRef = useRef(onInputBackspace);
  const onTabDownRef = useRef(onTabDown);
  const onTabUpRef = useRef(onTabUp);
  const onEscapeRef = useRef(onEscape);
  optionsRef.current = options;
  onEnterRef.current = onEnter;
  onInputSubmitRef.current = onInputSubmit;
  onInputKeyRef.current = onInputKey;
  onInputBackspaceRef.current = onInputBackspace;
  onTabDownRef.current = onTabDown;
  onTabUpRef.current = onTabUp;
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const key = e.key.toLowerCase();
      const isTextEntry = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (isTextEntry) {
        if ((key === 'enter' || key === ' ') && onInputSubmitRef.current) {
          e.preventDefault();
          onInputSubmitRef.current();
        }
        return;
      }

      if (key === 'tab' && onTabDownRef.current) {
        e.preventDefault();
        if (!e.repeat) onTabDownRef.current();
        return;
      }

      if (key === 'escape' && onEscapeRef.current) {
        e.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (onInputKeyRef.current && /^[0-9./-]$/.test(key)) {
        e.preventDefault();
        onInputKeyRef.current(key);
        return;
      }

      if (key === 'backspace' && onInputBackspaceRef.current) {
        e.preventDefault();
        onInputBackspaceRef.current();
        return;
      }

      const opts = optionsRef.current;

      const numIdx = parseInt(key) - 1;
      if (numIdx >= 0 && numIdx < opts.length && opts[numIdx]) {
        e.preventDefault();
        opts[numIdx]!();
        return;
      }

      if (key.length === 1 && key >= 'a' && key <= 'z') {
        const letterIdx = key.charCodeAt(0) - 97;
        if (letterIdx >= 0 && letterIdx < opts.length && opts[letterIdx]) {
          e.preventDefault();
          opts[letterIdx]!();
          return;
        }
      }

      if ((key === 'enter' || key === ' ') && onEnterRef.current) {
        e.preventDefault();
        onEnterRef.current();
      }
    };

    const keyUpHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const key = e.key.toLowerCase();
      const isTextEntry = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (isTextEntry) return;

      if (key === 'tab' && onTabUpRef.current) {
        e.preventDefault();
        onTabUpRef.current();
      }
    };

    document.addEventListener('keydown', handler);
    document.addEventListener('keyup', keyUpHandler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('keyup', keyUpHandler);
    };
  }, []);
}
