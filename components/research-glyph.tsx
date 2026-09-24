import type { ResearchGlyphKind } from "@/lib/site-data";

type ResearchGlyphProps = {
  kind: ResearchGlyphKind;
};

const iconProps = {
  "aria-hidden": true,
  className: "research-icon",
  fill: "none",
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
};

export function ResearchGlyph({ kind }: ResearchGlyphProps) {
  if (kind === "models") {
    return (
      <svg {...iconProps}>
        <path d="m4 7 8-3 8 3-8 3-8-3Z" />
        <path d="m4 11 8 3 8-3" />
        <path d="m4 15 8 3 8-3" />
      </svg>
    );
  }

  if (kind === "systems") {
    return (
      <svg {...iconProps}>
        <circle cx="5" cy="5" r="2.25" />
        <circle cx="19" cy="5" r="2.25" />
        <circle cx="12" cy="11" r="2.25" />
        <circle cx="12" cy="19" r="2.25" />
        <path d="m6.9 6.25 3.2 2.75M17.1 6.25 13.9 9M12 13.25v3.5" />
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <path d="M4 12h4.5C12 12 12 6 15.5 6H20" />
      <path d="M8.5 12C12 12 12 18 15.5 18H20" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="20" cy="6" r="1.5" />
      <circle cx="20" cy="18" r="1.5" />
    </svg>
  );
}
