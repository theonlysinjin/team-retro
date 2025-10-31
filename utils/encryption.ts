import CryptoJS from "crypto-js";

/**
 * Client-side encryption utilities for session data
 * All card content is encrypted before being sent to Convex
 */

export class SessionEncryption {
  private sessionKey: string;
  public sessionCode: string;

  constructor(sessionCode: string) {
    // Derive a session key from the session code
    // In production, this could be user-provided password
    this.sessionCode = sessionCode;
    this.sessionKey = CryptoJS.SHA256(sessionCode).toString();
    console.log("Encryption initialized for session:", sessionCode, "key hash:", this.sessionKey.substring(0, 16) + "...");
  }

  /**
   * Encrypt data before sending to Convex
   */
  encrypt(data: any): string {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, this.sessionKey).toString();
    console.log("Encrypting data:", jsonString, "→", encrypted.substring(0, 40) + "...");
    return encrypted;
  }

  /**
   * Decrypt data received from Convex
   */
  decrypt(encryptedData: string): any {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.sessionKey);
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      const result = JSON.parse(jsonString);
      console.log("Decrypted:", encryptedData.substring(0, 40) + "...", "→", jsonString);
      return result;
    } catch (error) {
      console.error("Decryption failed for:", encryptedData.substring(0, 40), error);
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
