// ============================================================
// بوابة الدفع — واجهة محايدة
// لوصل أي مزود: اكتب implement هنا فقط
// ============================================================

import type {
  InitiatePaymentParams,
  InitiatePaymentResult,
  VerifyPaymentResult,
  RefundPaymentParams,
  RefundPaymentResult,
} from './types'

// ============================================================
// الواجهة — لا تتغير عند تغيير المزود
// ============================================================

export interface PaymentGatewayInterface {
  initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult>
  verify(gatewayPaymentId: string): Promise<VerifyPaymentResult>
  refund(params: RefundPaymentParams): Promise<RefundPaymentResult>
}

// ============================================================
// المزود الحالي: Placeholder
// عند اختيار بوابة الدفع — استبدل هذا الكلاس فقط
// ============================================================

class PlaceholderGateway implements PaymentGatewayInterface {
  async initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    // TODO: استبدل بـ HyperPay / Tap / PayTabs / Telr
    const fakeId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    return {
      gatewayPaymentId: fakeId,
      // يوجّه للصفحة الداخلية حتى تُفعَّل البوابة الحقيقية
      checkoutUrl: `/payment/pending?payment_id=${fakeId}&amount=${params.amountSar}&type=${params.paymentType}&entity=${params.entityId}`,
    }
  }

  async verify(gatewayPaymentId: string): Promise<VerifyPaymentResult> {
    // TODO: استعلام من بوابة الدفع
    return { status: 'pending', gatewayPaymentId }
  }

  async refund(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    // TODO: استدعاء refund API من البوابة
    console.log('[Refund placeholder]', params)
    return { success: false }
  }
}

export const paymentGateway: PaymentGatewayInterface = new PlaceholderGateway()
