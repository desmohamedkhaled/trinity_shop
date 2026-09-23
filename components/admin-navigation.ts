import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Calendar,
  ClipboardList,
  FileImage,
  Gift,
  Heart,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import type { AdminPermission } from "@/components/admin-access";

export type AdminNavigationItem = {
  href: string;
  label: string;
  permission: AdminPermission;
  icon: LucideIcon;
};

export const adminNavigation: AdminNavigationItem[] = [
  { href: "/admin", label: "Dashboard", permission: "dashboard.read", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", permission: "products.read", icon: Package },
  { href: "/admin/inventory", label: "Inventory", permission: "inventory.read", icon: Boxes },
  { href: "/admin/occasions", label: "Occasions", permission: "occasions.read", icon: Gift },
  { href: "/admin/events", label: "Events", permission: "events.read", icon: Calendar },
  { href: "/admin/media", label: "Media", permission: "media.read", icon: FileImage },
  { href: "/admin/orders", label: "Requests / Orders", permission: "orders.read", icon: ClipboardList },
  { href: "/admin/customers", label: "Customers", permission: "customers.read", icon: Users },
  { href: "/admin/gift-lists", label: "Gift Lists", permission: "gift_lists.read", icon: Heart },
  { href: "/admin/content", label: "Homepage & Pages", permission: "pages.read", icon: ShoppingBag },
  { href: "/admin/gift-finder", label: "Gift Finder", permission: "gift_finder.read", icon: Sparkles },
  { href: "/admin/settings", label: "Settings", permission: "settings.read", icon: Settings },
];

export const adminPagePermissions = Object.fromEntries(
  adminNavigation.map(({ href, permission }) => [href, permission])
) as Record<string, AdminPermission>;