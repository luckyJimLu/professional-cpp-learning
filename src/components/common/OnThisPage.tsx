import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function OnThisPage({
  items,
  className,
}: {
  items: { id: string; label: string }[];
  className?: string;
}) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const update = () => {
      const passed = items.filter(
        (item) =>
          (document.getElementById(item.id)?.getBoundingClientRect().top ??
            Infinity) <= 160,
      );
      setActive(passed.at(-1)?.id ?? items[0]?.id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [items]);
  return (
    <nav className={cn("on-this-page text-sm", className)} aria-label="本页目录">
      <span className="eyebrow block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        本页内容
      </span>
      <div className="flex flex-col space-y-2 border-l border-border pl-3">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn(
              "transition-colors -ml-[13px] pl-3 border-l-2 py-0.5",
              active === item.id
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            aria-current={active === item.id ? "location" : undefined}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
