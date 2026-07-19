const STORAGE_KEY = "mordorProgress";

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { level1Complete: false, currentLevel: "shire" };
    }
    const data = JSON.parse(raw);
    return {
      level1Complete: Boolean(data.level1Complete),
      currentLevel: data.currentLevel === "rivendell" ? "rivendell" : "shire",
    };
  } catch {
    return { level1Complete: false, currentLevel: "shire" };
  }
}

export function saveProgress(patch) {
  const next = { ...loadProgress(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function markLevel1Complete() {
  return saveProgress({ level1Complete: true });
}
