import { NextResponse } from "next/server";
import { currentAdminAccess } from "@/lib/admin";

export async function GET() {
  const { user, admin, permissions } = await currentAdminAccess();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Admin access is inactive." }, { status: 403 });
  return NextResponse.json({ user: { id: user.id, email: user.email }, role: admin.role, permissions });
}
