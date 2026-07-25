const HEIC_EXTENSIONS = ["heic", "heif"];

export function validateFile(file, { maxMB = 15, extensions } = {}) {
  const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  if (HEIC_EXTENSIONS.includes(ext)) {
    return "HEIC/HEIF-Fotos werden nicht unterstützt. Bitte exportieren Sie das Bild als JPG oder PNG (z. B. über die iPhone-Kamera-Einstellungen: 'Kompatibel' statt 'Hohe Effizienz').";
  }
  if (extensions && !extensions.includes(ext)) {
    return `Nicht unterstütztes Dateiformat (.${ext || "?"}). Erlaubt: ${extensions.map((e) => `.${e}`).join(", ")}.`;
  }
  if (file.size > maxMB * 1024 * 1024) {
    return `Datei zu groß (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximal ${maxMB} MB erlaubt.`;
  }
  return null;
}
