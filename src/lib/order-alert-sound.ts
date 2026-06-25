// Som de alerta de novo pedido no painel.
// Extraído para um módulo dedicado para permitir testes isolados.

export const ALERT_SOUND_URL = "/sounds/alert.mp3";

let _alertAudio: HTMLAudioElement | null = null;
let _audioUnlocked = false;
let _unlockListenersAttached = false;
let _audioContext: AudioContext | null = null;
let _overrideUrl: string | null = null;

export function setAlertSoundOverride(url: string | null) {
  if (_overrideUrl === url) return;
  _overrideUrl = url;
  // força recriação do elemento Audio com a nova fonte
  _alertAudio = null;
}

export function hasAlertSoundOverride(): boolean {
  return !!_overrideUrl;
}

export function getAlertAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!_alertAudio) {
    _alertAudio = new Audio(_overrideUrl ?? ALERT_SOUND_URL);
    _alertAudio.preload = "auto";
    _alertAudio.volume = 0.9;
  }
  return _alertAudio;
}


function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  type AudioContextConstructor = new () => AudioContext;
  const AudioContextCtor: AudioContextConstructor | undefined =
    window.AudioContext ??
    (window as Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!_audioContext || _audioContext.state === "closed") {
    _audioContext = new AudioContextCtor();
  }
  return _audioContext;
}

export async function unlockNotificationAudio(): Promise<boolean> {
  let unlocked = false;

  const context = getAudioContext();
  if (context) {
    try {
      if (context.state === "suspended") await context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.03);
      unlocked = context.state === "running";
    } catch {
      // segue para fallback
    }
  }

  const audio = getAlertAudio();
  if (audio) {
    const prevVol = audio.volume;
    try {
      audio.volume = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      unlocked = true;
    } catch {
      // ignore
    } finally {
      audio.volume = prevVol;
    }
  }

  _audioUnlocked = unlocked;
  return unlocked;
}

export function unlockAudioOnFirstGesture() {
  if (typeof window === "undefined" || _audioUnlocked || _unlockListenersAttached) return;
  const unlock = () => {
    void unlockNotificationAudio().then((ok) => {
      if (!ok) return;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      _unlockListenersAttached = false;
    });
  };
  _unlockListenersAttached = true;
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock);
}

function playGeneratedChime(context: AudioContext) {
  const now = context.currentTime;
  [880, 1174.66, 1567.98].forEach((frequency, index) => {
    const start = now + index * 0.11;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.34);
  });
}

export function playNotificationSound() {
  const play = async () => {
    // Quando o admin enviou um som customizado, sempre tocamos esse arquivo.
    if (!_overrideUrl) {
      const context = getAudioContext();
      if (context) {
        if (context.state === "suspended") await context.resume();
        if (context.state === "running") {
          playGeneratedChime(context);
          _audioUnlocked = true;
          return;
        }
      }
    }

    const audio = getAlertAudio();
    if (!audio) return;
    audio.currentTime = 0;
    await audio.play();
    _audioUnlocked = true;
  };

  return play().catch((e) => {
    console.warn("Falha ao tocar alerta sonoro de novo pedido:", e);
    unlockAudioOnFirstGesture();
  });
}


  return play().catch((e) => {
    console.warn("Falha ao tocar alerta sonoro de novo pedido:", e);
    unlockAudioOnFirstGesture();
  });
}

// Apenas para testes: limpa estado interno do módulo.
export function __resetAlertSoundForTests() {
  _alertAudio = null;
  _audioContext = null;
  _audioUnlocked = false;
  _unlockListenersAttached = false;
}
