import { AllowedAction, LocalizedNotificationMessage } from '@razorrecover/shared-types';

export class NotificationMessageService {
  public generateMessage(
    action: AllowedAction,
    language: 'en' | 'hinglish' = 'en',
    amountInPaise?: number,
    actionUrl?: string
  ): LocalizedNotificationMessage {
    const formattedAmount = amountInPaise ? `₹${(amountInPaise / 100).toFixed(2)}` : 'your order';

    if (language === 'hinglish') {
      switch (action) {
        case 'OFFER_ALTERNATE_PAYMENT':
          return {
            language: 'hinglish',
            headline: 'Payment update — alternate option available',
            body: `Aapka ${formattedAmount} ka payment bank issue ki wajah se complete nahi ho paya. Kripya doosra payment method use karke retry karein.`,
            actionUrl,
          };
        case 'SEND_RECOVERY_LINK':
          return {
            language: 'hinglish',
            headline: 'Complete your pending order',
            body: `Aapka ${formattedAmount} ka order abhi pending hai. Naye secure link se payment complete karein:`,
            actionUrl,
          };
        case 'WAIT_AND_RETRY':
          return {
            language: 'hinglish',
            headline: 'Payment retry in progress',
            body: `Aapka bank server temporary down lag raha hai. Hum thodi der me auto-retry karenge.`,
            actionUrl,
          };
        case 'SEND_REMINDER':
          return {
            language: 'hinglish',
            headline: 'Reminder for pending payment',
            body: `Yeh aapke ${formattedAmount} order ka reminder hai. Link open karke payment poora karein.`,
            actionUrl,
          };
        default:
          return {
            language: 'hinglish',
            headline: 'Payment status notification',
            body: `Aapke order ke payment update ke liye hamari team se sampark karein.`,
            actionUrl,
          };
      }
    } else {
      switch (action) {
        case 'OFFER_ALTERNATE_PAYMENT':
          return {
            language: 'en',
            headline: 'Payment update — try another payment method',
            body: `Your payment of ${formattedAmount} could not be completed due to a temporary bank issue. Please try an alternate payment method.`,
            actionUrl,
          };
        case 'SEND_RECOVERY_LINK':
          return {
            language: 'en',
            headline: 'Complete your pending payment',
            body: `Your payment of ${formattedAmount} is pending. Use this secure link to complete your checkout:`,
            actionUrl,
          };
        case 'WAIT_AND_RETRY':
          return {
            language: 'en',
            headline: 'Automatic retry scheduled',
            body: `We noticed a brief network interruption. We will retry your payment automatically shortly.`,
            actionUrl,
          };
        case 'SEND_REMINDER':
          return {
            language: 'en',
            headline: 'Friendly reminder for your pending order',
            body: `This is a reminder to complete your checkout of ${formattedAmount}.`,
            actionUrl,
          };
        default:
          return {
            language: 'en',
            headline: 'Payment status notification',
            body: `Your transaction requires review. Please contact support if you need assistance.`,
            actionUrl,
          };
      }
    }
  }
}
