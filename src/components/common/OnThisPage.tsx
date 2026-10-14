import { useEffect, useState } from "react";

export function OnThisPage({
  items,
}: {
  items: { id: string; label: string }[];
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
    <nav className="on-this-page" aria-label="本页目录">
      <span className="eyebrow">本页内容</span>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={active === item.id ? "location" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
