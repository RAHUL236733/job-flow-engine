import React from "react";

function parseInline(content: string, keyPrefix: string) {
  const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, pidx) => {
    const k = `${keyPrefix}-${pidx}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={k} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={k} className="italic text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={k} className="rounded-md bg-muted/80 px-1.5 py-0.5 text-[14px] font-mono text-primary">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

type FormattedMessageProps = {
  text: string;
  className?: string;
};

export function FormattedMessage({ text, className = "" }: FormattedMessageProps) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={idx}
          className="text-[28px] font-bold tracking-tight text-foreground mt-4 mb-3 first:mt-0 leading-tight"
        >
          {line.replace(/^# /, "")}
        </h1>,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={idx}
          className="text-[22px] font-bold text-foreground tracking-tight mt-5 mb-2.5 border-b border-border/30 pb-1.5"
        >
          {line.replace(/^## /, "")}
        </h2>,
      );
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={idx} className="text-[18px] font-semibold text-foreground mt-4 mb-2">
          {line.replace(/^### /, "")}
        </h3>,
      );
      continue;
    }
    if (line.trim() === "---") {
      elements.push(<hr key={idx} className="my-4 border-border/40" />);
      continue;
    }
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={idx}
          className="my-3 border-l-4 border-primary/50 bg-primary/5 pl-4 py-2 rounded-r-xl"
        >
          <p className="text-[16px] text-muted-foreground italic leading-relaxed">
            {parseInline(line.replace(/^> /, ""), `bq-${idx}`)}
          </p>
        </blockquote>,
      );
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <div key={idx} className="flex gap-3 items-start mt-2">
          <span className="text-primary font-bold text-[16px] shrink-0">
            {line.match(/^(\d+)\./)![1]}.
          </span>
          <p className="text-[16px] text-foreground/90 leading-relaxed">
            {parseInline(line.replace(/^\d+\.\s/, ""), `ol-${idx}`)}
          </p>
        </div>,
      );
      continue;
    }
    if (/^[-•*]\s/.test(line)) {
      elements.push(
        <div key={idx} className="flex gap-3 items-start mt-2 pl-1">
          <span className="text-primary text-[18px] leading-none shrink-0 mt-0.5">•</span>
          <p className="text-[16px] text-foreground/90 leading-relaxed">
            {parseInline(line.replace(/^[-•*]\s/, ""), `ul-${idx}`)}
          </p>
        </div>,
      );
      continue;
    }
    if (line.trim() === "") {
      elements.push(<div key={idx} className="h-2" />);
      continue;
    }
    elements.push(
      <p key={idx} className="text-[16px] text-foreground/90 leading-relaxed mt-1">
        {parseInline(line, `p-${idx}`)}
      </p>,
    );
  }

  return <div className={["space-y-0.5", className].join(" ")}>{elements}</div>;
}
