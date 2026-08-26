import { Request, Response, NextFunction } from 'express';
import { SimulationService, ScenarioType } from '../services/simulation.service';

const simulationService = new SimulationService();

export async function runSimulationController(req: Request, res: Response, next: NextFunction) {
  try {
    const { scenario } = req.body;
    const validScenarios: ScenarioType[] = ['SCENARIO_A', 'SCENARIO_B', 'SCENARIO_C', 'SCENARIO_D'];

    if (!scenario || !validScenarios.includes(scenario as ScenarioType)) {
      return res.status(400).json({
        status: 'error',
        error: {
          message: `Invalid scenario. Must be one of: ${validScenarios.join(', ')}`,
          code: 'BAD_REQUEST'
        }
      });
    }

    const result = await simulationService.runSimulation(scenario as ScenarioType);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}
