import type { ReactNode } from "react";
import { asStringList } from "@/lib/n8n-response";

export { asStringList };

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest select-none">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function TextBlock({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{children}</p>
  );
}

export function NumberedItems({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ol className="space-y-2.5 list-none">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-3 text-sm text-slate-200 leading-relaxed rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3"
        >
          <span className="shrink-0 w-6 h-6 rounded-lg bg-[#8b5cf6]/20 text-[#8b5cf6] text-xs font-black flex items-center justify-center">
            {i + 1}
          </span>
          <span className="flex-1">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function BulletItems({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-2 text-sm text-slate-200 leading-relaxed rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-2.5"
        >
          <span className="text-[#8b5cf6] font-bold shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function TagPills({
  items,
  variant = "purple",
}: {
  items: string[];
  variant?: "purple" | "green" | "amber" | "red" | "blue";
}) {
  const styles = {
    purple: "bg-[#8b5cf6]/15 border-[#8b5cf6]/25 text-[#c4b5fd]",
    green: "bg-[#10b981]/15 border-[#10b981]/25 text-[#6ee7b7]",
    amber: "bg-amber-500/15 border-amber-500/25 text-amber-200",
    red: "bg-[#ef4444]/15 border-[#ef4444]/25 text-[#fca5a5]",
    blue: "bg-[#3b82f6]/15 border-[#3b82f6]/25 text-[#93c5fd]",
  };
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${styles[variant]}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function ScoreHero({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#3b82f6]/10 border border-[#8b5cf6]/30">
      <div className="relative w-24 h-24 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 264} 264`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white">
          {score}%
        </span>
      </div>
      <div>
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-bold text-white mt-1">ATS compatibility score</p>
        <p className="text-xs text-slate-400 mt-1">From your latest n8n resume analysis</p>
      </div>
    </div>
  );
}
