import { MerchantRepository } from '../repositories/merchant.repository';

export interface MerchantSettingsInput {
  recoveryWindowHours?: number;
  maxRetryAttempts?: number;
  maxNotifications?: number;
  highValueThreshold?: number; // in paise
  minAIConfidence?: number;
  contactOptInRequired?: boolean;
}

export interface MerchantSettingsData {
  recoveryWindowHours: number;
  maxRetryAttempts: number;
  maxNotifications: number;
  highValueThreshold: number;
  minAIConfidence: number;
  contactOptInRequired: boolean;
  updatedAt: string;
}

export class MerchantSettingsService {
  private merchantRepo = new MerchantRepository();

  private static settingsStoreByMerchant = new Map<string, MerchantSettingsData>();

  private getDefaultSettings(): MerchantSettingsData {
    return {
      recoveryWindowHours: 24,
      maxRetryAttempts: 3,
      maxNotifications: 2,
      highValueThreshold: 10000000, // ₹1,00,000 in paise
      minAIConfidence: 0.70,
      contactOptInRequired: true,
      updatedAt: new Date().toISOString()
    };
  }

  public async getSettings(merchantId = 'mch_test_01') {
    const merchant = await this.merchantRepo.findById(merchantId);
    const settings = MerchantSettingsService.settingsStoreByMerchant.get(merchantId) || this.getDefaultSettings();

    return {
      merchantId,
      merchantName: merchant?.name || `Merchant (${merchantId})`,
      currency: merchant?.currency || 'INR',
      testMode: merchant?.test_mode !== undefined ? merchant.test_mode : true,
      ...settings
    };
  }

  public async updateSettings(merchantId = 'mch_test_01', input: MerchantSettingsInput) {
    const settings = MerchantSettingsService.settingsStoreByMerchant.get(merchantId) || this.getDefaultSettings();

    if (input.recoveryWindowHours !== undefined) {
      if (input.recoveryWindowHours < 1 || input.recoveryWindowHours > 168) {
        throw new Error('Recovery window must be between 1 and 168 hours.');
      }
      settings.recoveryWindowHours = input.recoveryWindowHours;
    }

    if (input.maxRetryAttempts !== undefined) {
      if (input.maxRetryAttempts < 0 || input.maxRetryAttempts > 10) {
        throw new Error('Max retry attempts must be between 0 and 10.');
      }
      settings.maxRetryAttempts = input.maxRetryAttempts;
    }

    if (input.maxNotifications !== undefined) {
      if (input.maxNotifications < 0 || input.maxNotifications > 5) {
        throw new Error('Max notifications must be between 0 and 5.');
      }
      settings.maxNotifications = input.maxNotifications;
    }

    if (input.highValueThreshold !== undefined) {
      if (input.highValueThreshold < 10000) {
        throw new Error('High value threshold must be at least ₹100 (10000 paise).');
      }
      settings.highValueThreshold = input.highValueThreshold;
    }

    if (input.minAIConfidence !== undefined) {
      if (input.minAIConfidence < 0 || input.minAIConfidence > 1) {
        throw new Error('Min AI confidence must be between 0.0 and 1.0.');
      }
      settings.minAIConfidence = input.minAIConfidence;
    }

    if (input.contactOptInRequired !== undefined) {
      settings.contactOptInRequired = input.contactOptInRequired;
    }

    settings.updatedAt = new Date().toISOString();
    MerchantSettingsService.settingsStoreByMerchant.set(merchantId, settings);

    return this.getSettings(merchantId);
  }
}
