"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AdminPermission = string;

export type AccessStatus = "loading" | "loaded" | "unauthorized" | "error";

export type AdminAccess = {
  role: string;
  permissions: AdminPermission[];
};

type AdminAccessContextValue = {
  access: AdminAccess | null;
  can: (permission: AdminPermission) => boolean;
  refresh: () => void;
  status: AccessStatus;
};

const AdminAccessContext = createContext<AdminAccessContextValue | null>(null);

export function AdminAccessProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [status, setStatus] = useState<AccessStatus>("loading");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      const maxAttempts = 4;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (!active) return;

        try {
          const response = await fetch("/api/admin/access", {
            cache: "no-store",
          });

          if (!active) return;

          if (response.ok) {
            const data = await response.json().catch(() => null);

            if (!active) return;

            if (
              data &&
              typeof data === "object" &&
              typeof data.role === "string" &&
              Array.isArray(data.permissions) &&
              data.permissions.every(
                (permission: unknown) => typeof permission === "string"
              )
            ) {
              setAccess({
                role: data.role,
                permissions: data.permissions,
              });
              setStatus("loaded");
              return;
            }

            setAccess(null);
            setStatus("error");
            return;
          }

          if (response.status !== 401) {
            setAccess(null);
            setStatus("error");
            return;
          }

          // A 401 immediately after login can happen while the
          // Supabase browser session is still being persisted.
          if (attempt < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            continue;
          }

          setAccess(null);
          setStatus("unauthorized");
          return;
        } catch {
          if (!active) return;

          if (attempt < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            continue;
          }

          setAccess(null);
          setStatus("error");
          return;
        }
      }
    }

    loadAccess();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const value = useMemo<AdminAccessContextValue>(
    () => ({
      access,
      status,
      refresh: () => setRefreshKey((value) => value + 1),
      can: (permission) =>
        status === "loaded" &&
        Boolean(access?.permissions.includes(permission)),
    }),
    [access, status]
  );

  return createElement(
    AdminAccessContext.Provider,
    { value },
    children
  );
}

export function useAdminAccess() {
  const context = useContext(AdminAccessContext);

  if (!context) {
    throw new Error("useAdminAccess must be used within AdminAccessProvider");
  }

  return context;
}