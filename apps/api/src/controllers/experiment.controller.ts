import { Request, Response } from 'express';
import { ExperimentService } from '../services/experiment.service';

const experimentService = new ExperimentService();

export class ExperimentController {
  public static async createExperiment(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const { name, variants } = req.body;
      if (!name || !Array.isArray(variants) || variants.length < 2) {
        res.status(400).json({ status: 'error', error: { code: 'BAD_REQUEST', message: 'Name and at least 2 variants are required' } });
        return;
      }

      const experiment = await experimentService.createExperiment(merchantId, name, variants);
      res.status(201).json({ status: 'success', data: experiment });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  public static async listExperiments(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const experiments = await experimentService.getExperiments(merchantId);
      res.status(200).json({ status: 'success', data: experiments });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  public static async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const experimentId = req.params.id;
      const analytics = await experimentService.getExperimentAnalytics(merchantId, experimentId);
      res.status(200).json({ status: 'success', data: analytics });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }
}
