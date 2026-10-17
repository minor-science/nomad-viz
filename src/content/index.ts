import type { ModelId } from '../sim/types';
import type { ModelSources } from './types';
import { hydraulicSources } from './hydraulic';
import { metallurgicSources } from './metallurgic';
import { acousticSources } from './acoustic';
import { cosmicSources } from './cosmic';

export const SOURCES: Record<ModelId, ModelSources> = {
  hydraulic: hydraulicSources,
  metallurgic: metallurgicSources,
  acoustic: acousticSources,
  cosmic: cosmicSources,
};
