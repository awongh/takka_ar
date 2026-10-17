const asset = (path: string) => `${import.meta.env.BASE_URL}sounds/${path}`;

const FIRE_SRC = asset("projectile-fire-sound.wav");
const DESTROY_SRC = asset("animal-destroy-sound.wav");
const MUSIC_SRC = asset("background-music.mp3");

const MUSIC_VOLUME = 0.35;
const SFX_VOLUME = 0.8;

let music: HTMLAudioElement | null = null;
let musicPausedByUser = false;
const musicListeners = new Set<() => void>();

function notifyMusicListeners(): void {
  for (const listener of musicListeners) {
    listener();
  }
}

function playSfx(src: string, volume = SFX_VOLUME): void {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    void audio.play().catch(() => {
      // Autoplay may be blocked until a user gesture; ignore.
    });
  } catch {
    // Audio constructor unavailable in rare environments.
  }
}

export function playFireSound(): void {
  playSfx(FIRE_SRC);
}

export function playDestroySound(): void {
  playSfx(DESTROY_SRC);
}

function ensureMusic(): HTMLAudioElement {
  if (!music) {
    music = new Audio(MUSIC_SRC);
    music.loop = true;
    music.volume = MUSIC_VOLUME;
  }
  return music;
}

/** Start looping BGM. Call from a user gesture (button click). */
export function startBackgroundMusic(): void {
  try {
    musicPausedByUser = false;
    const audio = ensureMusic();
    void audio.play().catch(() => {
      // Retry on the next interaction if the browser blocks autoplay.
    });
    notifyMusicListeners();
  } catch {
    // ignore
  }
}

export function pauseBackgroundMusic(): void {
  if (!music) {
    return;
  }
  musicPausedByUser = true;
  music.pause();
  notifyMusicListeners();
}

export function resumeBackgroundMusic(): void {
  if (!music) {
    startBackgroundMusic();
    return;
  }
  musicPausedByUser = false;
  void music.play().catch(() => {
    // ignore
  });
  notifyMusicListeners();
}

export function toggleBackgroundMusic(): boolean {
  if (isBackgroundMusicPlaying()) {
    pauseBackgroundMusic();
    return false;
  }
  resumeBackgroundMusic();
  return true;
}

export function isBackgroundMusicPlaying(): boolean {
  return Boolean(music && !music.paused && !musicPausedByUser);
}

export function stopBackgroundMusic(): void {
  if (!music) {
    return;
  }
  musicPausedByUser = true;
  music.pause();
  music.currentTime = 0;
  notifyMusicListeners();
}

export function subscribeBackgroundMusic(
  listener: () => void,
): () => void {
  musicListeners.add(listener);
  return () => {
    musicListeners.delete(listener);
  };
}
