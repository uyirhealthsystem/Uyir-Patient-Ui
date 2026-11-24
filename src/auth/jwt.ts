// Reads the claims of our own access token. No signature check: the app only
// uses this to display / pre-fill values; every API call is verified by the
// gateway and services.

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of b64) {
    if (ch === "=") break;
    const idx = B64.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }
  // UTF-8 decode
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b < 0xe0) out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++i] & 0x3f));
    else if (b < 0xf0) out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f));
    else {
      const cp = ((b & 0x07) << 18) | ((bytes[++i] & 0x3f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f);
      out += String.fromCodePoint(cp);
    }
  }
  return out;
}

export interface AccessClaims {
  sub?: string;
  role?: string;
  email?: string;
  aud?: string;
  exp?: number;
}

export function readClaims(token: string | null | undefined): AccessClaims {
  if (!token) return {};
  const part = token.split(".")[1];
  if (!part) return {};
  try {
    return JSON.parse(base64UrlDecode(part)) as AccessClaims;
  } catch {
    return {};
  }
}
