import { NextResponse } from "next/server";
import { hasPermission, requirePermission, serviceSupabase } from "@/lib/admin";

export async function GET() {
  const access = await requirePermission("customers.read");
  if (access.response) return access.response;

  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Server database credentials are not configured." }, { status: 503 });

  const canReadRequests = hasPermission(access.admin, "requests.read");
  const canReadOrders = hasPermission(access.admin, "orders.read");
  const relations = [
    canReadRequests ? "requests(id,status,created_at,occasion,request_items(quantity,unit_price,products(name)))" : null,
    canReadOrders ? "orders(id,order_number,status,created_at,total,currency,order_items(product_name,quantity,line_total))" : null,
  ].filter(Boolean).join(",");
  const { data, error } = await supabase
    .from("customers")
    .select(`id,name,email,phone,created_at${relations ? `,${relations}` : ""}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    customers: data ?? [],
    canUpdate: hasPermission(access.admin, "customers.update"),
    canDelete: hasPermission(access.admin, "customers.delete"),
    canReadRequests,
    canReadOrders,
  });
}
