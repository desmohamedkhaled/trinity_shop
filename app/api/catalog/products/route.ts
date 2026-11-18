import { NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get("q")?.trim().toLocaleLowerCase();
  const products = await getProducts();
  const filtered = searchQuery
    ? products.filter((product) => `${product.name} ${product.description} ${product.meaning}`.toLocaleLowerCase().includes(searchQuery))
    : products;
  return NextResponse.json(filtered);
}
