import { MAX_SEED, PAYTABLES, type PayTableId } from '@/core';
import { z } from 'zod';
import { LIMITS } from './limits';

/**
 * Validação das entradas da API. Campos omitidos assumem o valor oficial do enunciado;
 * campos desconhecidos são rejeitados.
 */

const TABLE_IDS = Object.keys(PAYTABLES) as [PayTableId, ...PayTableId[]];

const int = (min: number, max: number) => z.number().int('deve ser inteiro').min(min, `mínimo ${min}`).max(max, `máximo ${max}`);
const seed = int(0, MAX_SEED);
const rounds = (min = 1) => int(min, LIMITS.maxRounds);
const table = z.enum(TABLE_IDS, 'tabela inexistente');
const uniqueList = <T extends z.ZodType>(item: T, maxSize: number) =>
  z
    .array(item)
    .min(1, 'informe ao menos um valor')
    .max(maxSize, `no máximo ${maxSize} valores`)
    .refine((xs) => new Set(xs).size === xs.length, 'valores repetidos');

export const E1Schema = z.strictObject({ seed: seed.optional(), rounds: rounds().optional(), table: table.optional() });

export const E2Schema = z.strictObject({
  seeds: uniqueList(seed, LIMITS.e2MaxSeeds).optional(),
  rounds: rounds().optional(),
  checkpoints: uniqueList(int(1, LIMITS.maxRounds), LIMITS.e2MaxCheckpoints).optional(),
  reproductionSeed: seed.optional(),
  reproductionCount: int(1, LIMITS.e2MaxReproduction).optional(),
  table: table.optional(),
});

export const E3Schema = z.strictObject({
  seed: seed.optional(),
  participants: int(1, LIMITS.e3MaxParticipants).optional(),
  initialBalance: z.number().min(1).max(LIMITS.e3MaxInitialBalance).optional(),
  maxRounds: int(1, LIMITS.e3MaxSessionRounds).optional(),
  trajectoriesShown: int(0, LIMITS.e3MaxTrajectories).optional(),
  table: table.optional(),
});

export const E4Schema = z.strictObject({ seed: seed.optional(), rounds: rounds(2).optional(), table: table.optional() });

export const E5Schema = z.strictObject({
  seed: seed.optional(),
  rounds: rounds().optional(),
  tables: uniqueList(table, TABLE_IDS.length).optional(),
});

export const CreateSessionSchema = z.strictObject({
  seed: seed.optional(),
  initialBalance: z.number().min(1).max(1_000_000).optional(),
  table: table.optional(),
});

export const SpinSchema = z.strictObject({
  token: z.string().min(1, 'token obrigatório'),
  count: int(1, 1000).optional(),
  bet: int(1, 1000).optional(),
});

export const TheoryQuerySchema = z.strictObject({ table: table.optional() });
