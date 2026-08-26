import { Request, Response } from 'express';
import { MultiChannelNotificationService } from '../services/multi-channel-notification.service';

const notificationService = new MultiChannelNotificationService();

export class NotificationController {
  public async dispatch(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).user?.merchantId || 'mch_test_01';
      const { recoveryCaseId, channel, templateName, language, customRecipient } = req.body;

      if (!recoveryCaseId || !channel || !templateName) {
        res.status(400).json({
          status: 'error',
          error: { code: 'INVALID_INPUT', message: 'recoveryCaseId, channel, and templateName are required' },
        });
        return;
      }

      const dispatch = await notificationService.dispatchNotification(merchantId, {
        recoveryCaseId,
        channel,
        templateName,
        language,
        customRecipient,
      });

      res.status(201).json({
        status: 'success',
        data: dispatch,
      });
    } catch (err: any) {
      res.status(400).json({
        status: 'error',
        error: { code: 'DISPATCH_FAILED', message: err.message },
      });
    }
  }

  public async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).user?.merchantId || 'mch_test_01';
      const history = await notificationService.getHistory(merchantId);
      res.status(200).json({
        status: 'success',
        data: history,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  public async getChannels(req: Request, res: Response): Promise<void> {
    try {
      const channels = await notificationService.getSupportedChannels();
      res.status(200).json({
        status: 'success',
        data: channels,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }
}
