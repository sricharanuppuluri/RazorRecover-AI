import { MerchantRepository } from '../repositories/merchant.repository';

export interface MerchantSettingsInput {
  recoveryWindowHours?: number;
  maxRetryAttempts?: number;
  maxNotifications?: number;
  highValueThreshold?: number; // in paise
  minAIConfidence?: number;
  contactOptInRequired?: boolean;
}

export class MerchantSettingsService {
  private merchantRepo = new MerchantRepository();

  private static settingsStore = {
    recoveryWindowHours: 24,
    maxRetryAttempts: 3,
    maxNotifications: 2,
    highValueThreshold: 10000000, // ₹1,00,000 in paise
    minAIConfidence: 0.70,
    contactOptInRequired: true,
    updatedAt: new Date().toISOString()
  };

  public async getSettings(merchantId = 'mch_test_01') {
    const merchant = await this.merchantRepo.findById(merchantId);
    return {
      merchantId,
      merchantName: merchant?.name || 'RazorRecover Demo Merchant',
      currency: merchant?.currency || 'INR',
      testMode: merchant?.test_mode !== undefined ? merchant.test_mode : true,
      ...MerchantSettingsService.settingsStore
    };
  }

  public async updateSettings(merchantId = 'mch_test_01', input: MerchantSettingsInput) {
    if (input.recoveryWindowHours !== undefined) {
      if (input.recoveryWindowHours < 1 || input.recoveryWindowHours > 168) {
        throw new Error('Recovery window must be between 1 and 168 hours.');
      }
      MerchantSettingsService.settingsStore.recoveryWindowHours = input.recoveryWindowHours;
    }

    if (input.maxRetryAttempts !== undefined) {
      if (input.maxRetryAttempts < 0 || input.maxRetryAttempts > 10) {
        throw new Error('Max retry attempts must be between 0 and 10.');
      }
      MerchantSettingsService.settingsStore.maxRetryAttempts = input.maxRetryAttempts;
    }

    if (input.maxNotifications !== undefined) {
      if (input.maxNotifications < 0 || input.maxNotifications > 5) {
        throw new Error('Max notifications must be between 0 and 5.');
      }
      MerchantSettingsService.settingsStore.maxNotifications = input.maxNotifications;
    }

    if (input.highValueThreshold !== undefined) {
      if (input.highValueThreshold < 10000) {
        throw new Error('High value threshold must be at least ₹100 (10000 paise).');
      }
      MerchantSettingsService.settingsStore.highValueThreshold = input.highValueThreshold;
    }

    if (input.minAIConfidence !== undefined) {
      if (input.minAIConfidence < 0 || input.minAIConfidence > 1) {
        throw new Error('Min AI confidence must be between 0.0 and 1.0.');
      }
      MerchantSettingsService.settingsStore.minAIConfidence = input.minAIConfidence;
    }

    if (input.contactOptInRequired !== undefined) {
      MerchantSettingsService.settingsStore.contactOptInRequired = input.contactOptInRequired;
    }

    MerchantSettingsService.settingsStore.updatedAt = new Date().toISOString();

    return this.getSettings(merchantId);
  }
}
