export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.WASENDER_API_KEY
  if (!apiKey) {
    console.log(`[DEV] WhatsApp to ${phone}:\n${message}`)
    return true
  }
  // تأكد أن الرقم يبدأ بـ +966
  const to = phone.startsWith('+') ? phone : `+966${phone.replace(/^0/, '')}`
  const res = await fetch('https://www.wasenderapi.com/api/send-message', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, text: message }),
  })
  if (!res.ok) console.error('WhatsApp send error:', await res.text())
  return res.ok
}

// قوالب الرسائل
export const messages = {
  bookingConfirmed: (facilityName: string, date: string, time: string, amount: number) =>
    `✅ *تم تأكيد حجزك!*\n\n🏟️ ${facilityName}\n📅 ${date}\n🕐 ${time}\n💰 ${amount} ريال\n\nشكراً لاستخدام *ملاعبنا* ⚽`,

  bookingCancelled: (facilityName: string, date: string) =>
    `❌ *تم إلغاء الحجز*\n\n🏟️ ${facilityName}\n📅 ${date}\n\nيمكنك الحجز مرة أخرى من التطبيق.`,

  subscriptionConfirmed: (academyName: string, programName: string, amount: number) =>
    `✅ *تم تأكيد اشتراكك!*\n\n🏅 ${academyName}\n📚 ${programName}\n💰 ${amount} ريال\n\nمرحباً بك في *ملاعبنا* 🌟`,

  tournamentRegistered: (tournamentName: string, teamName: string) =>
    `🏆 *تم استلام طلب تسجيل فريقك!*\n\n🏆 ${tournamentName}\n👥 ${teamName}\n\nسيتم إشعارك بعد المراجعة.`,

  tournamentTeamApproved: (tournamentName: string, teamName: string) =>
    `✅ *تم قبول فريقك في البطولة!*\n\n🏆 ${tournamentName}\n👥 ${teamName}\n\nبالتوفيق! 💪`,

  partnerApproved: (activityLabel: string) =>
    `✅ *تم تفعيل نشاطك على ملاعبنا!*\n\n🎉 ${activityLabel}\n\nيمكنك الآن إضافة وإدارة نشاطك من التطبيق.`,
}
