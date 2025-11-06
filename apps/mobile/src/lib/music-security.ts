/**
 * Music URL Security
 *
 * Validates music URLs against an allowlist of trusted domains to prevent
 * malicious content from being loaded into the audio player.
 */

/**
 * Allowed domains for music streaming
 * These are trusted sources for royalty-free music
 */
const ALLOWED_MUSIC_DOMAINS = [
  // Incompetech (Kevin MacLeod) - CC BY 4.0
  "incompetech.com",
  "www.incompetech.com",

  // Bensound - Royalty Free Music
  "bensound.com",
  "www.bensound.com",

  // Free Music Archive
  "freemusicarchive.org",
  "www.freemusicarchive.org",
  "files.freemusicarchive.org",

  // Additional trusted sources (can be extended)
  // Add more domains here as needed
];

/**
 * Normalize hostname to ASCII (handles IDN/punycode)
 * Returns a result object with ok flag to avoid throwing exceptions
 */
function normalizeHostname(hostname: string): {
  ok: boolean;
  value?: string;
} {
  try {
    let normalized = hostname.trim().toLowerCase();
    if (normalized.endsWith(".")) normalized = normalized.slice(0, -1);
    // Reject IDN/non-ascii without throwing (React Native often lacks punycode)
    if (!/^[\x00-\x7F]*$/.test(normalized)) return { ok: false };
    return { ok: true, value: normalized };
  } catch {
    return { ok: false };
  }
}

/**
 * List of safe audio file extensions
 */
const SAFE_AUDIO_EXTENSIONS = [".mp3", ".ogg", ".wav", ".m4a"];

/**
 * Validate a music URL against the allowlist
 *
 * @param url - The music URL to validate
 * @returns true if the URL is from an allowed domain, false otherwise
 */
export function isValidMusicUrl(url: string): boolean {
  try {
    // Disallow non-network schemes explicitly
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      console.warn("Music URL blocked: Non-network scheme not allowed");
      return false;
    }

    const urlObj = new URL(url);

    if (urlObj.protocol !== "https:") {
      console.warn(
        `Music URL blocked: Only HTTPS is allowed, got ${urlObj.protocol}`,
      );
      return false;
    }

    if (urlObj.username || urlObj.password) {
      console.warn("Music URL blocked: URLs with credentials are not allowed");
      return false;
    }

    if (urlObj.port && urlObj.port !== "443") {
      console.warn(
        `Music URL blocked: Non-standard port ${urlObj.port} not allowed`,
      );
      return false;
    }

    const norm = normalizeHostname(urlObj.hostname);
    if (!norm.ok || !norm.value) {
      console.warn("Music URL blocked: Unsupported hostname");
      return false;
    }
    const hostname = norm.value;

    const isAllowed = ALLOWED_MUSIC_DOMAINS.some((domain) => {
      const d = domain.toLowerCase();
      return hostname === d || hostname.endsWith(`.${d}`);
    });

    if (!isAllowed) {
      console.warn(`Music URL blocked: ${hostname} is not in the allowlist`);
      return false;
    }

    // Enforce safe audio file extensions
    const pathname = urlObj.pathname.toLowerCase();
    const hasSafeExt = SAFE_AUDIO_EXTENSIONS.some((ext) =>
      pathname.endsWith(ext),
    );
    if (!hasSafeExt) {
      console.warn(
        "Music URL blocked: Path does not end with a safe audio extension",
      );
      return false;
    }

    // Basic traversal guard
    if (pathname.includes("..")) {
      console.warn("Music URL blocked: Path traversal detected");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Invalid music URL:", error);
    return false;
  }
}

/**
 * Get the list of allowed music domains (for documentation/debugging)
 */
export function getAllowedMusicDomains(): readonly string[] {
  return Object.freeze([...ALLOWED_MUSIC_DOMAINS]);
}

/**
 * Validate music URL and throw error if invalid
 * Use this when you want to fail fast rather than return boolean
 */
export function validateMusicUrlOrThrow(url: string): void {
  if (!isValidMusicUrl(url)) {
    throw new Error(
      `Music URL from untrusted domain. Only URLs from the following domains are allowed: ${ALLOWED_MUSIC_DOMAINS.join(", ")}`,
    );
  }
}
