import { barras } from './configs-barras';
import { interruptores } from './configs-interruptores';
import type { ConfigDef } from '../lib/scenario';

export const CONFIGS: ConfigDef[] = [...barras, ...interruptores];

export const bySlug = (slug: string) => CONFIGS.find(c => c.slug === slug);
