"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase";
import { useAdminAccess } from "@/components/admin-access";
import { adminPagePermissions } from "@/components/admin-navigation";

export function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(pathname !== "/admin/login");
  const { access, can, status } = useAdminAccess();

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecking(false);
      return;
    }

    if (status === "loading") {
      setChecking(true);
      return;
    }

    if (status === "unauthorized" || status === "error") {
      setChecking(false);
      router.replace("/admin/login");
      return;
    }

    const supabase = browserSupabase();

    if (!supabase) {
      setChecking(false);
      router.replace("/admin/login");
      return;
    }

    let alive = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!alive) return;

      if (!data.user) {
        setChecking(false);
        router.replace("/admin/login");
        return;
      }

      const { data: admin } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", data.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!alive) return;

      if (!admin) {
        setChecking(false);
        router.replace("/admin/login");
        return;
      }

      if (!access) {
        setChecking(false);
        return;
      }

      const matchedPath = Object.keys(adminPagePermissions).find((route) => pathname === route || (route !== "/admin" && pathname.startsWith(`${route}/`)));
      if (!matchedPath) {
        setChecking(false);
        return;
      }

      const requiredPermission = adminPagePermissions[matchedPath];
      if (!can(requiredPermission)) {
        const fallbackPath = Object.entries(adminPagePermissions).find(([, permission]) => can(permission))?.[0] ?? "/admin/login";
        setChecking(false);
        if (fallbackPath !== pathname && fallbackPath !== "/admin/login") {
          router.replace(fallbackPath);
          return;
        }
        router.replace("/admin/login");
        return;
      }

      setChecking(false);
    });

    return () => {
      alive = false;
    };
  }, [access, can, pathname, router, status]);

  if (checking && pathname !== "/admin/login") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f7] p-6 text-sm text-black/50">
        Checking admin access...
      </main>
    );
  }

  return <>{children}</>;
}