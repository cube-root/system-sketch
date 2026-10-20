export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span>
          System<span className="brand-light">Sketch</span>
          <span className="brand-period">.</span>
        </span>
      )}
    </span>
  )
}
