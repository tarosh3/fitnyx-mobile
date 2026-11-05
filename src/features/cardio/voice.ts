import { requireOptionalNativeModule } from 'expo';

/**
 * Spoken cues: the phone is on the console or in an armband, often out of sight.
 * A build without the native module (an older dev client) simply stays silent:
 * checking first, because in dev even a caught failed require shows the red screen.
 */
type Speech = { speak: (text: string) => void; stop: () => unknown };

let speech: Speech | null | undefined;

function load(): Speech | null {
  if (speech === undefined) {
    speech = requireOptionalNativeModule('ExpoSpeech') ? (require('expo-speech') as Speech) : null;
  }
  return speech;
}

export function say(text: string): void {
  try {
    const s = load();
    s?.stop();
    s?.speak(text);
  } catch {
    // Best effort: a cue that can't be spoken is still on the screen.
  }
}

export function hush(): void {
  try {
    load()?.stop();
  } catch {
    // Nothing was speaking.
  }
}
