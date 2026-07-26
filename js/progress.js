const STORAGE_KEY = "mordorProgress";

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        level1Complete: false,
        level3Complete: false,
        level4Complete: false,
        level5Complete: false,
        currentLevel: "shire",
      };
    }
    const data = JSON.parse(raw);
    const validLevels = new Set(["shire", "rivendell", "moria", "lothlorien", "anduin"]);
    return {
      level1Complete: Boolean(data.level1Complete),
      level3Complete: Boolean(data.level3Complete),
      level4Complete: Boolean(data.level4Complete),
      level5Complete: Boolean(data.level5Complete),
      currentLevel: validLevels.has(data.currentLevel) ? data.currentLevel : "shire",
    };
  } catch {
    return {
      level1Complete: false,
      level3Complete: false,
      level4Complete: false,
      level5Complete: false,
      currentLevel: "shire",
    };
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

export function markLevel3Complete() {
  return saveProgress({ level3Complete: true });
}

export function markLevel4Complete() {
  return saveProgress({ level4Complete: true });
}

export function markLevel5Complete() {
  return saveProgress({ level5Complete: true });
}
