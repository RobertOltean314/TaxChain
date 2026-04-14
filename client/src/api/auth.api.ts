import api from "./axios";
import type { AuthTokens } from "../types";

export const authApi = {
  loginWithGoogle: async (idToken: string): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>("/auth/google", {
      id_token: idToken,
    });
    return data;
  },

  getWalletNonce: async (address: string): Promise<string> => {
    const { data } = await api.get<{ nonce: string }>(
      `/auth/wallet/nonce?address=${address}`,
    );
    return data.nonce;
  },

  verifyWallet: async (
    address: string,
    signature: string,
  ): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>("/auth/wallet/verify", {
      address,
      signature,
    });
    return data;
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post("/auth/logout", { refresh_token: refreshToken });
  },

  /**
   * Links the authenticated user to a PersoanaFizica or PersoanaJuridica
   * record. Returns fresh tokens with updated entity IDs in the claims.
   * At least one of the two IDs must be non-null.
   */
  linkEntity: async (params: {
    persoana_fizica_id?: string;
    persoana_juridica_id?: string;
  }): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>("/auth/link-entity", params);
    return data;
  },
};
