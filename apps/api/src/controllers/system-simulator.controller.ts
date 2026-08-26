import { Request, Response } from 'express';
import { SystemSimulatorService } from '../services/system-simulator.service';

const simulatorService = new SystemSimulatorService();

export class SystemSimulatorController {
  public async getScenarios(req: Request, res: Response): Promise<void> {
    try {
      const scenarios = simulatorService.getAvailableScenarios();
      res.status(200).json({
        status: 'success',
        data: scenarios,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  public async runScenario(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).user?.merchantId || 'mch_test_01';
      const { scenarioId, customAmount } = req.body;

      if (!scenarioId) {
        res.status(400).json({
          status: 'error',
          error: { code: 'INVALID_INPUT', message: 'scenarioId is required' },
        });
        return;
      }

      const result = await simulatorService.executeScenario(merchantId, scenarioId, customAmount);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        status: 'error',
        error: { code: 'SIMULATION_FAILED', message: err.message },
      });
    }
  }
}
