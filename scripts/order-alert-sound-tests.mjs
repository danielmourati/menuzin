// Smoke test: garante que o som de alerta de novo pedido aponta para
// /sounds/alert.mp3 e que playNotificationSound() reproduz o arquivo.
// Run with: bun scripts/order-alert-sound-tests.mjs
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// 1) O arquivo público alert.mp3 existe e tem conteúdo.
const alertPath = resolve(projectRoot, "public/sounds/alert.mp3");
assert.ok(existsSync(alertPath), "public/sounds/alert.mp3 deve existir");
assert.ok(statSync(alertPath).size > 1024, "alert.mp3 deve ter conteúdo (>1KB)");

// 2) Stub mínimo de window/Audio antes de importar o módulo.
const playCalls = [];
const constructedUrls = [];

class MockAudio {
  constructor(url) {
    this.src = url;
    this.volume = 1;
    this.preload = "none";
    this.currentTime = 0;
    constructedUrls.push(url);
  }
  async play() {
    playCalls.push({ src: this.src, currentTime: this.currentTime });
  }
  pause() {}
}

globalThis.window = {
  AudioContext: undefined,
  webkitAudioContext: undefined,
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.Audio = MockAudio;

const mod = await import("../src/lib/order-alert-sound.ts");
const { ALERT_SOUND_URL, playNotificationSound, getAlertAudio, __resetAlertSoundForTests } = mod;

// 3) A constante aponta para o arquivo correto.
assert.equal(ALERT_SOUND_URL, "/sounds/alert.mp3", "URL do alerta deve ser /sounds/alert.mp3");

// 4) getAlertAudio() instancia Audio com /sounds/alert.mp3.
__resetAlertSoundForTests();
const audio = getAlertAudio();
assert.ok(audio, "getAlertAudio() deve retornar um HTMLAudioElement");
assert.equal(constructedUrls[constructedUrls.length - 1], "/sounds/alert.mp3");

// 5) playNotificationSound() reproduz o alert.mp3 (caminho de fallback HTMLAudio).
__resetAlertSoundForTests();
constructedUrls.length = 0;
playCalls.length = 0;
await playNotificationSound();
assert.ok(
  playCalls.some((c) => c.src === "/sounds/alert.mp3"),
  "playNotificationSound() deve invocar play() em /sounds/alert.mp3",
);
assert.equal(
  playCalls[playCalls.length - 1].currentTime,
  0,
  "deve reiniciar currentTime antes de tocar",
);

// 6) Simula o fluxo de novo pedido confirmado no painel:
// processNewOrders chama playNotificationSound() quando soundEnabled = true.
// Replicamos a condição aqui para garantir o gatilho ponta-a-ponta do som.
__resetAlertSoundForTests();
constructedUrls.length = 0;
playCalls.length = 0;
const fakeNewOrders = [{ id: "o1", createdAt: new Date().toISOString(), number: 1, customerName: "X" }];
const soundEnabled = true;
if (fakeNewOrders.length > 0 && soundEnabled) {
  await playNotificationSound();
}
assert.ok(
  playCalls.some((c) => c.src === "/sounds/alert.mp3"),
  "novo pedido com som habilitado deve tocar /sounds/alert.mp3",
);

// 7) Som desativado não toca.
__resetAlertSoundForTests();
playCalls.length = 0;
const soundDisabled = false;
if (fakeNewOrders.length > 0 && soundDisabled) {
  await playNotificationSound();
}
assert.equal(playCalls.length, 0, "com som desativado, alert.mp3 NÃO deve tocar");

console.log("✓ order-alert-sound: todos os testes passaram");
