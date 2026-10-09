import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateCareGaps } from '../lib/careGaps';

describe('Care-Gap Engine v2 Shared Test Vectors (TypeScript)', () => {
  const vectorsPath = path.resolve(process.cwd(), '../shared/test-vectors/care-gaps.json');
  const fallbackVectorsPath = path.resolve(process.cwd(), 'shared/test-vectors/care-gaps.json');
  const finalPath = fs.existsSync(vectorsPath) ? vectorsPath : fallbackVectorsPath;

  const rawJson = fs.readFileSync(finalPath, 'utf-8');
  const vectors = JSON.parse(rawJson);

  vectors.forEach((caseItem: any, index: number) => {
    it(`Case ${index + 1}: ${caseItem.description}`, () => {
      const gaps = evaluateCareGaps(caseItem.resources, caseItem.as_of);
      const actualCodes = gaps.map((g) => g.code);
      expect(actualCodes).toEqual(caseItem.expected_codes);
    });
  });
});
