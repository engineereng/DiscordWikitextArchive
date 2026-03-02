import { evaluateThreshold } from '../votecount.js';

describe('evaluateThreshold', () => {
  describe('minimum voter requirement', () => {
    test('returns null when fewer than 7 total voters', () => {
      expect(evaluateThreshold(5, 1, 0).result).toBe('null');
      expect(evaluateThreshold(3, 2, 1).result).toBe('null');
      expect(evaluateThreshold(0, 0, 0).result).toBe('null');
    });

    test('does not return null with exactly 7 voters', () => {
      expect(evaluateThreshold(7, 0, 0).result).not.toBe('null');
    });
  });

  describe('support threshold (75%)', () => {
    test('passes with exactly 75% support', () => {
      // 9 support out of 12 = 75%
      expect(evaluateThreshold(9, 3, 0).result).toBe('support');
    });

    test('passes with > 75% support', () => {
      expect(evaluateThreshold(10, 2, 0).result).toBe('support');
      expect(evaluateThreshold(7, 0, 0).result).toBe('support');
    });

    test('fails with < 75% support', () => {
      // 8 support out of 12 = 66.7%
      expect(evaluateThreshold(8, 4, 0).result).toBe('oppose');
    });

    test('100% support passes', () => {
      expect(evaluateThreshold(15, 0, 0).result).toBe('support');
    });
  });

  describe('restructure threshold (75%)', () => {
    test('passes with 75% restructure', () => {
      // 9 restructure out of 12 = 75%
      expect(evaluateThreshold(0, 3, 9).result).toBe('restructure');
    });

    test('passes with > 75% restructure', () => {
      expect(evaluateThreshold(1, 1, 8).result).toBe('restructure');
    });

    test('fails with < 75% restructure', () => {
      // 5 restructure out of 10 = 50%
      expect(evaluateThreshold(2, 3, 5).result).toBe('oppose');
    });
  });

  describe('support and restructure are independent', () => {
    test('support + restructure combined >= 75% but neither alone does not pass', () => {
      // 5 support (50%) + 3 restructure (30%) + 2 oppose (20%) = 10 total
      // Combined positive = 80%, but neither alone is 75%
      expect(evaluateThreshold(5, 2, 3).result).toBe('oppose');
    });

    test('both over 75% is impossible (support wins)', () => {
      // Can't have both >= 75% since they'd need > 150% total
      // But if support is >= 75%, it wins regardless
      expect(evaluateThreshold(8, 1, 1).result).toBe('support');
    });
  });

  describe('oppose (fallthrough)', () => {
    test('returns oppose when neither support nor restructure reaches 75%', () => {
      expect(evaluateThreshold(5, 3, 2).result).toBe('oppose');
    });

    test('returns oppose with even split', () => {
      expect(evaluateThreshold(4, 3, 3).result).toBe('oppose');
    });
  });

  describe('reason messages', () => {
    test('null reason mentions voter count', () => {
      const { reason } = evaluateThreshold(3, 2, 1);
      expect(reason).toContain('6/7');
    });

    test('support reason mentions percentage', () => {
      const { reason } = evaluateThreshold(9, 3, 0);
      expect(reason).toContain('75');
    });

    test('oppose reason mentions both percentages', () => {
      const { reason } = evaluateThreshold(5, 3, 2);
      expect(reason).toContain('Support');
      expect(reason).toContain('Restructure');
    });
  });
});
