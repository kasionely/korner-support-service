import axios from "axios";

const KORNER_MAIN_URL = process.env.KORNER_MAIN_URL || "http://localhost:3001";

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

    return response.data;
  } catch (error) {
    return null;
  }
};
