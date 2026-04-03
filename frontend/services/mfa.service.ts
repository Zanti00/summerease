import { enrollMfa, verifyMfa, disableMfa } from "@/lib/actions/mfaActions";

/**
 * Service to manage MFA interactions from client components.
 * It wraps the server actions to provide a consistent service layer.
 */
export const mfaService = {
  /**
   * Starts the enrollment process. 
   * Returns: { success: boolean, data: { qrCodeUrl: string, secret: string, backupCodes: string[] } }
   */
  async enroll() {
    return await enrollMfa();
  },

  /**
   * Finalizes enablement or acts as a login challenge. 
   * @param token - The 6-digit TOTP code.
   * Returns: { success: boolean, data?: any, error?: any }
   */
  async verify(token: string) {
    return await verifyMfa(token);
  },

  /**
   * Turns off MFA for the current user.
   * @param token - The 6-digit TOTP code.
   * Returns: { success: boolean, error?: any }
   */
  async disable(token: string) {
    return await disableMfa(token);
  },
};
