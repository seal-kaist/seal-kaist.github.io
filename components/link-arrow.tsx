type LinkArrowProps = {
  className?: string;
};

export function LinkArrow({ className = "" }: LinkArrowProps) {
  return (
    <svg
      aria-hidden="true"
      className={`link-arrow ${className}`.trim()}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <line className="link-arrow-shaft" x1="9" x2="18" y1="12" y2="12" />
      <path className="link-arrow-head" d="m14 8 4 4-4 4" />
    </svg>
  );
}
