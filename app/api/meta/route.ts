import {
  ARCADE,
  BET,
  DISCLAIMER,
  E1_OFFICIAL,
  E2_OFFICIAL,
  E3_OFFICIAL,
  E4_OFFICIAL,
  E5_OFFICIAL,
  MAX_SEED,
  PAYTABLES,
  PAYTABLE_LABELS,
  REEL,
  RNG_INFO,
} from '@/core';
import { LIMITS } from '@/lib/server/limits';

export function GET() {
  return Response.json({
    disclaimer: DISCLAIMER,
    rules: { reel: REEL, bet: BET, paytables: PAYTABLES, paytableLabels: PAYTABLE_LABELS },
    arcade: ARCADE,
    generator: { ...RNG_INFO, maxSeed: MAX_SEED },
    runtime: { node: process.version },
    officialParams: { 1: E1_OFFICIAL, 2: E2_OFFICIAL, 3: E3_OFFICIAL, 4: E4_OFFICIAL, 5: E5_OFFICIAL },
    limits: LIMITS,
  });
}
