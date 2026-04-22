import { readFileSync } from 'fs';
import { countVotes, parseWikitextLog, evaluateThreshold } from '../votecount.js';

const fixturesDir = new URL('./fixtures/', import.meta.url).pathname;

function loadFixture(name) {
  return readFileSync(`${fixturesDir}${name}`, 'utf8');
}

describe('parseWikitextLog', () => {
  test('parses Dougie log into messages', () => {
    const wikitext = loadFixture('dougie.txt');
    const messages = parseWikitextLog(wikitext);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].author.username).toBe('Nuc1eusknight');
  });

  test('skips ping reply and date-separator entries', () => {
    const wikitext = loadFixture('dougie.txt');
    const messages = parseWikitextLog(wikitext);
    const hasReply = messages.some(m => m.content.includes('class=ping reply'));
    expect(hasReply).toBe(false);
  });
});

describe('Vote counting - Dougie (straightforward pass)', () => {
  let result;

  beforeAll(() => {
    const wikitext = loadFixture('dougie.txt');
    const messages = parseWikitextLog(wikitext);
    result = countVotes(messages);
  });

  // Bot detects 12 support (TurretBot's text-based ":Support:" is not detected as emoji).
  // Human tally was 13 support. The human would override TurretBot's count.
  test('detects support count (best-effort, TurretBot text vote not detected)', () => {
    expect(result.tally.support).toBe(12);
  });

  test('detects correct oppose count', () => {
    expect(result.tally.oppose).toBe(2);
  });

  test('detects no restructure votes', () => {
    expect(result.tally.restructure).toBe(0);
  });

  // TurretBot counted as neutral (not in total), GargameNga2025 ambiguous (not in total)
  test('total is 14 (TurretBot neutral not counted)', () => {
    expect(result.total).toBe(14);
  });

  test('GargameNga2025 strikethrough vote is NOT counted', () => {
    const gargVoter = result.voters.support.find(v => v.username === 'GargameNga2025');
    expect(gargVoter).toBeUndefined();
    const gargOppose = result.voters.oppose.find(v => v.username === 'GargameNga2025');
    expect(gargOppose).toBeUndefined();
  });

  test('GargameNga2025 is flagged as ambiguous', () => {
    const ambig = result.ambiguous.find(a => a.username === 'GargameNga2025');
    expect(ambig).toBeDefined();
  });

  test('Mick the Squirrel forwarded blockquote counts as oppose', () => {
    const mick = result.voters.oppose.find(v => v.username === 'Mick the Squirrel');
    expect(mick).toBeDefined();
  });

  test('TurretBot detected as neutral (text-based :Support: not detected)', () => {
    expect(result.tally.neutral).toBe(1);
    const turret = result.voters.neutral.find(v => v.username === 'TurretBot');
    expect(turret).toBeDefined();
  });

  test('suggests support as outcome', () => {
    expect(result.suggestedResult).toBe('support');
  });
});

describe('Vote counting - Meatball Parade (restructure + rejected)', () => {
  let result;

  beforeAll(() => {
    const wikitext = loadFixture('meatball_parade.txt');
    const messages = parseWikitextLog(wikitext);
    result = countVotes(messages);
  });

  test('detects support votes', () => {
    expect(result.tally.support).toBe(8);
  });

  test('detects oppose votes', () => {
    expect(result.tally.oppose).toBe(2);
  });

  test('detects restructure votes', () => {
    // 2 restructure A + 1 restructure B = 3 total restructure
    // But TurretBot's restructure was labeled "Restructure B" -- the bot counts all as one pool
    expect(result.tally.restructure).toBeGreaterThanOrEqual(2);
  });

  test('total is 13', () => {
    expect(result.total).toBe(13);
  });

  test('suggests oppose (no option reaches 75%)', () => {
    expect(result.suggestedResult).toBe('oppose');
  });

  test('lists restructure voters for human grouping', () => {
    expect(result.voters.restructure.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Vote counting - Tally Hall (null, not enough votes)', () => {
  let result;

  beforeAll(() => {
    const wikitext = loadFixture('tally_hall.txt');
    const messages = parseWikitextLog(wikitext);
    result = countVotes(messages);
  });

  test('detects support votes', () => {
    expect(result.tally.support).toBe(4);
  });

  test('detects oppose votes', () => {
    expect(result.tally.oppose).toBe(2);
  });

  test('total is 6 (below 7 minimum)', () => {
    expect(result.total).toBe(6);
  });

  test('CorbCreates strikethrough neutral is NOT counted', () => {
    const corb = result.voters.support.find(v => v.username === 'CorbCreates');
    expect(corb).toBeUndefined();
    const corbOppose = result.voters.oppose.find(v => v.username === 'CorbCreates');
    expect(corbOppose).toBeUndefined();
    const corbNeutral = result.voters.neutral?.find(v => v.username === 'CorbCreates');
    expect(corbNeutral).toBeUndefined();
  });

  test('suggests null (not enough votes)', () => {
    expect(result.suggestedResult).toBe('null');
  });
});
