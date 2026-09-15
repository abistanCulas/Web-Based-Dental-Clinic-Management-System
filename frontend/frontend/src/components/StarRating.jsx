import { Star } from 'lucide-react'

export default function StarRating({ value, size = 15 }) {
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= value ? 'currentColor' : 'none'}
          className={n <= value ? '' : 'off'}
          strokeWidth={1.75}
        />
      ))}
    </span>
  )
}
