export function Swash({ children }) {
  return (
    <span className="swash">
      {children}
      <svg viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M4 15 C 40 8, 90 6, 130 9 S 185 15, 196 11"
          fill="none"
          stroke="var(--apricot)"
          strokeWidth="16"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

// Splits the title so the last word gets the swash, then ends it with a period.
export default function PageTitle({ children, size = "lg", className = "" }) {
  const text = String(children).trim();
  const i = text.lastIndexOf(" ");
  const head = i === -1 ? "" : text.slice(0, i + 1);
  const tail = i === -1 ? text : text.slice(i + 1);
  return (
    <h1 className={`headline headline-${size} ${className}`}>
      {head}
      <Swash>{tail}</Swash>.
    </h1>
  );
}
