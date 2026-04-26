"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

const TOKEN_KEY = "guardian_token";
const USER_KEY = "guardian_user";

export interface GuardianChild {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
}

export interface Guardian {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  communication_preference: "email_only" | "sms_only" | "both";
  students: GuardianChild[];
}

interface LoginResponse {
  token: string;
  guardian: Guardian;
}

async function callLogin(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/guardian-auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

async function callMe(): Promise<Guardian> {
  return apiFetch<Guardian>("/guardian-auth/me");
}

async function callLogout(): Promise<void> {
  return apiFetch<void>("/guardian-auth/logout", { method: "POST" });
}

export function useGuardianAuth() {
  const router = useRouter();
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        setGuardian(JSON.parse(stored) as Guardian);
      } catch {
        setGuardian(null);
      }
    }
    setLoading(false);
  }, []);

  const isAuthenticated = !!localStorage.getItem(TOKEN_KEY) && !!guardian;

  async function login(email: string, password: string): Promise<void> {
    const data = await callLogin(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.guardian));
    setGuardian(data.guardian);
  }

  async function logout(): Promise<void> {
    try {
      await callLogout();
    } catch {
      // proceed with local cleanup even if API fails
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setGuardian(null);
    router.push("/guardian/login");
  }

  async function refresh(): Promise<void> {
    try {
      const g = await callMe();
      localStorage.setItem(USER_KEY, JSON.stringify(g));
      setGuardian(g);
    } catch {
      logout();
    }
  }

  return { guardian, isAuthenticated, loading, login, logout, refresh };
}
