import useSWR, { mutate } from "swr";
import { apiFetch, swrFetcher } from "@/lib/api";
import type { ApiListResponse, User, UserRole } from "@/types";

type UsersResponse = ApiListResponse<User>;
const KEY = "/users";

export interface CreateUserPayload {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
}

export function useUsers() {
  const { data, error, isLoading } = useSWR<UsersResponse>(KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const users: User[] = data?.data ?? [];

  async function create(payload: CreateUserPayload): Promise<User> {
    const created = await apiFetch<User>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mutate(KEY);
    return created;
  }

  async function updateUser(userId: string, payload: UpdateUserPayload): Promise<User> {
    const updated = await apiFetch<User>(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    mutate(KEY);
    return updated;
  }

  async function remove(userId: string): Promise<void> {
    await apiFetch(`/users/${userId}`, { method: "DELETE" });
    mutate(KEY);
  }

  async function resetPassword(userId: string, password: string): Promise<void> {
    await apiFetch(`/users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  }

  return {
    users,
    isLoading,
    error: error?.message ?? null,
    create,
    updateUser,
    remove,
    resetPassword,
  };
}
