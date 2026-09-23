import { notFound } from "next/navigation";

export default async function JournalArticle({ params }: { params: Promise<{ slug: string }> }) {
  await params;
  notFound();
}
