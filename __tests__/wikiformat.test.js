import {
  toOrdinal,
  logPageTitle,
  archiveAnchor,
  proposalsPageRow,
  archiveEntry,
  todoRow,
  progressRow,
} from '../wikiformat.js';

describe('toOrdinal', () => {
  test('1st through 4th', () => {
    expect(toOrdinal(1)).toBe('1st');
    expect(toOrdinal(2)).toBe('2nd');
    expect(toOrdinal(3)).toBe('3rd');
    expect(toOrdinal(4)).toBe('4th');
  });

  test('teens use th', () => {
    expect(toOrdinal(11)).toBe('11th');
    expect(toOrdinal(12)).toBe('12th');
    expect(toOrdinal(13)).toBe('13th');
  });

  test('20s', () => {
    expect(toOrdinal(20)).toBe('20th');
    expect(toOrdinal(21)).toBe('21st');
    expect(toOrdinal(22)).toBe('22nd');
    expect(toOrdinal(23)).toBe('23rd');
    expect(toOrdinal(24)).toBe('24th');
  });

  test('30 and 31', () => {
    expect(toOrdinal(30)).toBe('30th');
    expect(toOrdinal(31)).toBe('31st');
  });

  test('other values', () => {
    expect(toOrdinal(5)).toBe('5th');
    expect(toOrdinal(9)).toBe('9th');
    expect(toOrdinal(10)).toBe('10th');
    expect(toOrdinal(14)).toBe('14th');
    expect(toOrdinal(19)).toBe('19th');
    expect(toOrdinal(25)).toBe('25th');
    expect(toOrdinal(29)).toBe('29th');
  });
});

describe('logPageTitle', () => {
  test('generates correct title', () => {
    expect(logPageTitle(22, 'Meatball Parade'))
      .toBe('SiIvaGunner Wiki:Meme discussion/Log/22nd: Meatball Parade');
  });

  test('handles quoted subjects', () => {
    expect(logPageTitle(24, '"Weird Al" Yankovic'))
      .toBe('SiIvaGunner Wiki:Meme discussion/Log/24th: "Weird Al" Yankovic');
  });

  test('handles 1st of month', () => {
    expect(logPageTitle(1, 'Winter Wrap Up'))
      .toBe('SiIvaGunner Wiki:Meme discussion/Log/1st: Winter Wrap Up');
  });
});

describe('archiveAnchor', () => {
  test('generates correct anchor', () => {
    expect(archiveAnchor(14, 'Teach Me How to Dougie'))
      .toBe('14th: Teach Me How to Dougie');
  });
});

describe('proposalsPageRow', () => {
  const baseOpts = {
    subject: 'Teach Me How to Dougie',
    day: 14,
    proposer: 'Nuc1eusknight',
    startDate: 'April 14, 2025',
    endDate: 'April 21, 2025',
  };

  test('support row', () => {
    const row = proposalsPageRow({ ...baseOpts, voteResult: 'support' });
    expect(row).toContain('|[[/Log/14th: Teach Me How to Dougie|Teach Me How to Dougie]]');
    expect(row).toContain('|[[User:Nuc1eusknight|Nuc1eusknight]]');
    expect(row).toContain('{{Icon|Voting-support.svg}}');
    expect(row).toContain('[[/Archive#14th: Teach Me How to Dougie|Summary]]');
  });

  test('oppose row', () => {
    const row = proposalsPageRow({ ...baseOpts, voteResult: 'oppose' });
    expect(row).toContain('{{Icon|Voting-oppose.svg}}');
  });

  test('restructure row', () => {
    const row = proposalsPageRow({ ...baseOpts, voteResult: 'restructure' });
    expect(row).toContain('{{Icon|Voting-restructure.svg}}');
  });

  test('null row has no log link', () => {
    const row = proposalsPageRow({ ...baseOpts, voteResult: 'null' });
    expect(row).not.toContain('[[/Log/');
    expect(row).toContain('Null');
  });

  test('each cell is on its own line', () => {
    const row = proposalsPageRow({ ...baseOpts, voteResult: 'support' });
    const lines = row.split('\n');
    expect(lines).toHaveLength(5);
    expect(lines.every(l => l.startsWith('|'))).toBe(true);
  });
});

describe('archiveEntry', () => {
  test('generates support entry with VoteSummary template', () => {
    const entry = archiveEntry({
      subject: 'Teach Me How to Dougie',
      day: 14,
      summary: 'We will make a meme page and category for Teach Me How to Dougie.',
      voteResult: 'support',
      supportCount: 13,
      opposeCount: 2,
      restructureCount: 0,
    });
    expect(entry).toBe(
      '==== 14th: Teach Me How to Dougie ====\n' +
      '*We will make a meme page and category for Teach Me How to Dougie. {{VoteSummary|13|2|0}}'
    );
  });

  test('generates null entry', () => {
    const entry = archiveEntry({
      subject: 'Tally Hall',
      day: 11,
      summary: '',
      voteResult: 'null',
      supportCount: 4,
      opposeCount: 2,
      restructureCount: 0,
    });
    expect(entry).toBe(
      '==== 11th: Tally Hall ====\n' +
      '*Not enough votes (6/7) - proposal nulled.'
    );
  });

  test('includes restructure in VoteSummary', () => {
    const entry = archiveEntry({
      subject: 'Meatball Parade',
      day: 22,
      summary: 'We will not make a meme page or category for Meatball Parade.',
      voteResult: 'oppose',
      supportCount: 8,
      opposeCount: 2,
      restructureCount: 3,
    });
    expect(entry).toContain('{{VoteSummary|8|2|3}}');
  });
});

describe('todoRow', () => {
  test('generates scaffold row with multiline cells', () => {
    const row = todoRow({
      subject: 'Teach Me How to Dougie',
      day: 14,
      summary: 'Create meme page for Teach Me How to Dougie',
    });
    expect(row).toContain('SiIvaGunner_Wiki:Meme_discussion/Archive#14th: Teach Me How to Dougie');
    expect(row).toContain("# ''To be filled in by a wiki editor''");
    expect(row).toContain('|0%');
    const lines = row.split('\n');
    expect(lines).toHaveLength(4);
  });
});

describe('progressRow', () => {
  test('generates scaffold row with relative link and 5 columns', () => {
    const row = progressRow({
      subject: 'Teach Me How to Dougie',
      day: 14,
      summary: 'Create meme page for Teach Me How to Dougie',
      currentDate: 'April 21, 2025',
    });
    expect(row).toContain('[[../Archive#14th: Teach Me How to Dougie|April 21, 2025]]');
    expect(row).toContain("| '''Not done'''");
    expect(row).toContain('| April 21, 2025');
    const lines = row.split('\n');
    expect(lines).toHaveLength(5);
  });
});
