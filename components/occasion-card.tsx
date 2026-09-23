"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";

export function OccasionCard({ item }: { item: {slug:string;name:string;subtitle:string;image:string} }) {
  const imageSrc = item.image && item.image.trim().length > 0 ? item.image : "/images/cross-pattern.png";

  return <Link href={`/occasions/${item.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-[var(--trinity-radius-md)] border border-black/10 shadow-sm">
    <motion.div whileHover={{scale:1.04}} transition={{duration:.7}} className="absolute inset-0">
      <Image src={imageSrc} alt={item.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
    </motion.div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"/>
    <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
      <p className="text-xs uppercase tracking-[.22em] text-white/75">Meaningful moment</p>
      <h3 className="display-font mt-2 text-4xl">{item.name}</h3>
      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-sm text-white/80">{item.subtitle}</p>
        <span className="rounded-full border border-white/50 p-2 transition group-hover:bg-white group-hover:text-black"><ArrowUpRight size={18}/></span>
      </div>
    </div>
  </Link>;
}
