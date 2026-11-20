export default function BrandMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#E34252" />
      <path d="M16 5.5C16 5.5 8.5 14 8.5 19.2a7.5 7.5 0 0 0 15 0C23.5 14 16 5.5 16 5.5z" fill="#fff" />
      <path d="M16 21.6l-3.3-3.9M16 21.6l3.3-3.9M12.7 17.7h6.6" stroke="#E34252" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="16" cy="21.6" r="1.5" fill="#E34252" />
      <circle cx="12.7" cy="17.7" r="1.5" fill="#E34252" />
      <circle cx="19.3" cy="17.7" r="1.5" fill="#E34252" />
    </svg>
  )
}
