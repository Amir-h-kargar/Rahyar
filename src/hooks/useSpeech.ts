import { useCallback, useEffect, useRef, useState } from 'react';

export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  isFinal: boolean;
  0: SpeechAlternative;
  length: number;
}
interface SpeechResultList {
  length: number;
  [index: number]: SpeechResult;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechResultList;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechConstructor = new () => SpeechRecognitionLike;

function getConstructor(): SpeechConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechConstructor;
    webkitSpeechRecognition?: SpeechConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechInput() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(Boolean(getConstructor()));
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop?.();
    setListening(false);
  }, []);

  const start = useCallback(
    (onText: (text: string) => void, onError?: (message: string) => void): boolean => {
      const Ctor = getConstructor();
      if (!Ctor) {
        onError?.('مرورگرت از ورود صوتی پشتیبانی نمی‌کند. می‌توانی تایپ کنی.');
        return false;
      }
      recognitionRef.current?.abort?.();
      const recognition = new Ctor();
      recognition.lang = 'fa-IR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      let finalText = '';
      recognition.onstart = () => setListening(true);
      recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText = text;
        }
        if (finalText.trim()) onText(finalText.trim());
        else if (text.trim()) onText(text.trim());
      };
      recognition.onerror = (event) => {
        setListening(false);
        const message =
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'دسترسی به میکروفون داده نشد. از تنظیمات مرورگر اجازه بده.'
            : event.error === 'no-speech'
              ? 'صدایی نشنیدم. یک بار دیگر امتحان کن.'
              : 'ورود صوتی انجام نشد. می‌توانی تایپ کنی.';
        onError?.(message);
      };
      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };
      try {
        recognition.start();
        return true;
      } catch {
        setListening(false);
        onError?.('ورود صوتی شروع نشد. یک بار دیگر امتحان کن.');
        return false;
      }
    },
    [],
  );

  return { supported, listening, start, stop };
}
