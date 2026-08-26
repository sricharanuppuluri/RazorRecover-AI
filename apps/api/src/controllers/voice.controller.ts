import { Request, Response } from 'express';
import { VoiceService } from '../services/voice.service';

const voiceService = new VoiceService();

export class VoiceController {
  public static async initiateCall(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const { recoveryCaseId, language } = req.body;
      if (!recoveryCaseId) {
        res.status(400).json({ status: 'error', error: { code: 'BAD_REQUEST', message: 'recoveryCaseId is required' } });
        return;
      }

      const session = await voiceService.initiateVoiceCall(merchantId, { recoveryCaseId, language });
      res.status(201).json({ status: 'success', data: session });
    } catch (err: any) {
      res.status(400).json({ status: 'error', error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  public static async interact(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const sessionId = req.params.sessionId;
      const { userUtterance } = req.body;
      if (!userUtterance) {
        res.status(400).json({ status: 'error', error: { code: 'BAD_REQUEST', message: 'userUtterance is required' } });
        return;
      }

      const result = await voiceService.interact(merchantId, { sessionId, userUtterance });
      res.status(200).json({ status: 'success', data: result });
    } catch (err: any) {
      res.status(400).json({ status: 'error', error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  public static async getSession(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const sessionId = req.params.sessionId;
      const session = await voiceService.getSession(merchantId, sessionId);
      res.status(200).json({ status: 'success', data: session });
    } catch (err: any) {
      res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: err.message } });
    }
  }

  public static async listSessions(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const sessions = await voiceService.listSessions(merchantId);
      res.status(200).json({ status: 'success', data: sessions });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }
}
