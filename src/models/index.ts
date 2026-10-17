import type { ModelDef, ModelId } from '../sim/types';
import { hydraulic } from './hydraulic';
import { metallurgic } from './metallurgic';
import { acoustic } from './acoustic';
import { cosmic } from './cosmic';

export const MODELS: ModelDef[] = [hydraulic, metallurgic, acoustic, cosmic];

export const MODEL: Record<ModelId, ModelDef> = Object.fromEntries(
  MODELS.map((m) => [m.id, m]),
) as Record<ModelId, ModelDef>;

export const isModelId = (s: string | null): s is ModelId => !!s && s in MODEL;
