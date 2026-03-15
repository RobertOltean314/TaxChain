import api from "./axios";
import type { AuthTokens } from "../types";

export const loginGoogle = async (id_token: string): Promise<AuthTokens> =>
  (await api.post<AuthTokens>("/auth/google", { id_token })).data;

export const walletNonce = async (address: string): Promise<string> =>
  (await api.get<{ nonce: string }>(`/auth/wallet/nonce?address=${address}`)).data.nonce;

export const walletVerify = async (address: string, signature: string): Promise<AuthTokens> =>
  (await api.post<AuthTokens>("/auth/wallet/verify", { address, signature })).data;

export const refreshTokens = async (refresh_token: string): Promise<AuthTokens> =>
  (await api.post<AuthTokens>("/auth/refresh", { refresh_token })).data;

export const logoutApi = async (refresh_token: string): Promise<void> => {
  await api.post("/auth/logout", { refresh_token });
};
