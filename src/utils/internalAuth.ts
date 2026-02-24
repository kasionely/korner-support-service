import axios from "axios";

function ensureProtocol(url: string): string {
  if (!/^https?:\/\//.test(url)) return `http://${url}`;
  return url;
}

const KORNER_MAIN_URL = ensureProtocol(process.env.KORNER_MAIN_URL || "http://localhost:3001");

export interface InternalUser {
  id: number;
  email: string;
  username?: string;
}

/**
 * Verify JWT token and get user data from korner-main-service
 */
export const getUserByToken = async (token: string): Promise<InternalUser | null> => {
  try {
    const response = await axios.get(`${KORNER_MAIN_URL}/internal/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // Main-service returns { user: { id, email, ... } }
    return response.data.user ?? response.data;
  } catch (error) {
    return null;
  }
};
