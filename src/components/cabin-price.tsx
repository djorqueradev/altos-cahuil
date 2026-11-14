import { formatCLP } from '@/lib/money'

export function CabinPrice({ price, className = '' }: { price: number; className?: string }) {
  if (!price) return <span className={className}>Precio por confirmar</span>
  return (
    <span className={className}>
      desde <strong className="text-[22px] text-cream">{formatCLP(price)}</strong> / noche
    </span>
  )
}
