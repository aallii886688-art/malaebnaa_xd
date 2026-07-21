export type PaymentType = 'booking' | 'subscription' | 'tournament'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'

export interface InitiatePaymentParams {
  userId: string
  paymentType: PaymentType
  entityId: string
  amountSar: number
  description: string
  successUrl: string
  failUrl: string
  metadata?: Record<string, string>
}

export interface InitiatePaymentResult {
  gatewayPaymentId: string
  checkoutUrl: string
}

export interface VerifyPaymentResult {
  status: 'paid' | 'failed' | 'pending'
  gatewayPaymentId: string
  paidAt?: string
}

export interface RefundPaymentParams {
  gatewayPaymentId: string
  amountSar: number
  reason: string
}

export interface RefundPaymentResult {
  success: boolean
  gatewayRefundId?: string
}

export interface CommissionCalc {
  totalSar: number
  commissionSar: number
  netSar: number
  commissionRate: number
}
