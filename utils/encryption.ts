import CryptoJS from "crypto-js";

/**
 * Client-side encryption utilities for session data
 * All card content is encrypted before being sent to Convex
 */

export class SessionEncryption {
  private sessionKey: string;

  constructor(sessionCode: string) {
    // Derive a session key from the session code
    // In production, this could be user-provided password
    this.sessionKey = CryptoJS.SHA256(sessionCode).toString();
  }

  /**
   * Encrypt data before sending to Convex
   */
  encrypt(data: any): string {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, this.sessionKey).toString();
    return encrypted;
  }

  /**
   * Decrypt data received from Convex
   */
  decrypt(encryptedData: string): any {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.sessionKey);
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Decryption failed:", error);
      return null;
    }
  }

  /**
   * Generate a random color for user presence indicators
   */
  static generateUserColor(userName: string): string {
    // Generate consistent color based on username
    const hash = CryptoJS.MD5(userName).toString();
    const hue = parseInt(hash.substring(0, 8), 16) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }
}

/**
 * Encrypt card data
 */
export function encryptCardData(
  content: string,
  color: string,
  category: string | null,
  encryption: SessionEncryption
): string {
  return encryption.encrypt({
    content,
    color,
    category,
  });
}

/**
 * Decrypt card data
 */
export function decryptCardData(
  encryptedData: string,
  encryption: SessionEncryption
): {
  content: string;
  color: string;
  category: string | null;
} | null {
  return encryption.decrypt(encryptedData);
}

/**
 * Encrypt group data
 */
export function encryptGroupData(
  name: string | undefined,
  color: string | undefined,
  encryption: SessionEncryption
): string {
  return encryption.encrypt({
    name,
    color,
  });
}

/**
 * Decrypt group data
 */
export function decryptGroupData(
  encryptedData: string,
  encryption: SessionEncryption
): {
  name?: string;
  color?: string;
} | null {
  return encryption.decrypt(encryptedData);
}
