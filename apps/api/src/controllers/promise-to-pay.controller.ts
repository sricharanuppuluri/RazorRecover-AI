import { Request, Response } from 'express';
import { PromiseToPayService } from '../services/promise-to-pay.service';

const promiseService = new PromiseToPayService();

export class PromiseToPayController {
  public createPromise = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
        return;
      }

      const { recoveryCaseId, promisedAmount, promisedDate, notes } = req.body;
      if (!recoveryCaseId || !promisedAmount || !promisedDate) {
        res.status(400).json({ status: 'error', error: { message: 'Missing required parameters', code: 'INVALID_INPUT' } });
        return;
      }

      const promise = await promiseService.createPromise(
        merchantId,
        recoveryCaseId,
        Number(promisedAmount),
        promisedDate,
        notes,
        req.user?.userId || 'system'
      );

      res.status(201).json({ status: 'success', data: promise });
    } catch (err: any) {
      res.status(400).json({ status: 'error', error: { message: err.message, code: 'PROMISE_CREATE_FAILED' } });
    }
  };

  public updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
        return;
      }

      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ status: 'error', error: { message: 'Status is required', code: 'INVALID_INPUT' } });
        return;
      }

      const updated = await promiseService.updatePromiseStatus(
        id,
        merchantId,
        status,
        req.user?.userId || 'system'
      );

      res.status(200).json({ status: 'success', data: updated });
    } catch (err: any) {
      res.status(400).json({ status: 'error', error: { message: err.message, code: 'PROMISE_UPDATE_FAILED' } });
    }
  };

  public listPromises = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
        return;
      }

      const promises = await promiseService.listPromises(merchantId);
      res.status(200).json({ status: 'success', data: promises });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { message: err.message, code: 'INTERNAL_ERROR' } });
    }
  };
}
