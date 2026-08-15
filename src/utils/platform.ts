export const isMac =
  typeof navigator !== "undefined" &&
  (navigator.userAgent.includes("Macintosh") || navigator.userAgent.includes("Mac OS"));
