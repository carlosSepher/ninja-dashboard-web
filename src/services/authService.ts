import axios, { isAxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8200/api/v1";

const trimTrailingSlash = (value: string | null | undefined) =>
  value ? value.replace(/\/$/, "") : "";

const LOGIN_URL = `${trimTrailingSlash(API_BASE_URL)}/auth/login`;

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginSuccess {
  accessToken: string;
  tokenType: string;
}

export const login = async (payload: LoginPayload): Promise<LoginSuccess> => {
  try {
    const response = await axios.post<LoginSuccess>(LOGIN_URL, payload);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error("Correo o contrasena no validos");
      }

      const detail =
        (typeof error.response?.data?.detail === "string" && error.response.data.detail.trim()) ||
        error.message;
      throw new Error(detail || "No se pudo iniciar sesion");
    }

    throw error as Error;
  }
};
