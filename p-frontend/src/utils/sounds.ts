import foldSound from "../assets/sounds/fold.wav";
import callSound from "../assets/sounds/click.wav";
import raiseSound from "../assets/sounds/raise.wav";
import winnerSound from "../assets/sounds/winner.mp3";
import checkSound from "../assets/sounds/check.wav";
import revealSound from "../assets/sounds/end-flip.wav";
import dealSound from "../assets/sounds/card-flip.wav";

const audioMap = {
  call: new Audio(callSound),
  raise: new Audio(raiseSound),
  check: new Audio(checkSound),
  fold: new Audio(foldSound),
  winner: new Audio(winnerSound),
  reveal: new Audio(revealSound),
  deal: new Audio(dealSound),
};

let unlocked = false;
let muted = localStorage.getItem("sound-muted") === "true";
let masterVolume = parseFloat(localStorage.getItem("sound-volume") ?? "1");

// Apply persisted volume immediately
Object.values(audioMap).forEach((a) => { a.volume = masterVolume; });

export function setMuted(value: boolean) {
  muted = value;
  localStorage.setItem("sound-muted", String(value));
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem("sound-muted", String(muted));
  return muted;
}

export function isMuted() {
  return muted;
}

export function setVolume(vol: number) {
  masterVolume = Math.max(0, Math.min(1, vol));
  localStorage.setItem("sound-volume", String(masterVolume));
  Object.values(audioMap).forEach((a) => { a.volume = masterVolume; });
}

export function getVolume() {
  return masterVolume;
}

export function unlockAudio() {
  if (unlocked) return;

  Object.values(audioMap).forEach((audio) => {
    audio.volume = 0;
    audio.play().catch(() => {});
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
  });

  unlocked = true;
}

export function playActionSound(action?: string) {
  if (!action || muted) return;

  let sound: keyof typeof audioMap | null = null;

  if (action.includes("Fold")) sound = "fold";
  else if (action.includes("Raise")) sound = "raise";
  else if (action.includes("Call")) sound = "call";
  else if (action.includes("Check")) sound = "check";
  else if (action.includes("Reveal")) sound = "reveal";

  if (!sound) return;

  const audio = audioMap[sound];
  audio.pause();
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
