import { processLinks } from '../markdown.js';
import { formatMessageToWikitext } from '../archive.js';

describe('Link Processing', () => {
  describe('Raw URLs in angle brackets', () => {
    test('Template links', () => {
      const input = '<https://siivagunner.fandom.com/wiki/Template:Nickelodeon>';
      expect(processLinks(input)).toBe('{{t|Nickelodeon}}');
    });

    test('Category links', () => {
      const input = '<https://siivagunner.fandom.com/wiki/Category:Katamari_Damacy>';
      expect(processLinks(input)).toBe('[[:Category:Katamari Damacy]]');
    });

    test('Regular wiki page links', () => {
      const input = '<https://siivagunner.fandom.com/wiki/Katamari_on_the_Rocks_-_Katamari_Damacy>';
      expect(processLinks(input)).toBe('[[Katamari on the Rocks - Katamari Damacy]]');
    });
  });

  describe('Masked links with angle brackets [text](<url>)', () => {
    test('Template links', () => {
      const input = '[Template:Nickelodeon](<https://siivagunner.fandom.com/wiki/Template:Nickelodeon>)';
      expect(processLinks(input)).toBe('[[Template:Nickelodeon|Template:Nickelodeon]]');
    });

    test('Category links', () => {
      const input = '[Category:Katamari Damacy](<https://siivagunner.fandom.com/wiki/Category:Katamari_Damacy>)';
      expect(processLinks(input)).toBe('[[:Category:Katamari Damacy|Category:Katamari Damacy]]');
    });

    test('Regular wiki page links', () => {
      const input = '[Katamari Day](<https://siivagunner.fandom.com/wiki/Katamari_Day>)';
      expect(processLinks(input)).toBe('[[Katamari Day|Katamari Day]]');
    });
  });

  describe('Regular markdown links [text](url)', () => {
    test('Template links', () => {
      const input = '[Custom name](https://siivagunner.fandom.com/wiki/Template:Nickelodeon)';
      expect(processLinks(input)).toBe('[[Template:Nickelodeon|Custom name]]');
    });

    test('Category links', () => {
      const input = '[Games](https://siivagunner.fandom.com/wiki/Category:Games)';
      expect(processLinks(input)).toBe('[[:Category:Games|Games]]');
    });

    test('Regular wiki page links', () => {
      const input = '[Cool rip](https://siivagunner.fandom.com/wiki/Katamari_Day)';
      expect(processLinks(input)).toBe('[[Katamari Day|Cool rip]]');
    });

    test('External links', () => {
      const input = '[YouTube](https://www.youtube.com)';
      expect(processLinks(input)).toBe('[https://www.youtube.com YouTube]');
    });
  });

  describe('Raw URLs', () => {
    test('Template links', () => {
      const input = 'https://siivagunner.fandom.com/wiki/Template:Nickelodeon';
      expect(processLinks(input)).toBe('{{t|Nickelodeon}}');
    });

    test('Category links', () => {
      const input = 'https://siivagunner.fandom.com/wiki/Category:Games';
      expect(processLinks(input)).toBe('[[:Category:Games]]');
    });

    test('Regular wiki page links', () => {
      const input = 'https://siivagunner.fandom.com/wiki/Katamari_Day';
      expect(processLinks(input)).toBe('[[Katamari Day]]');
    });
  });

  describe('Full message formatting', () => {
    const authors = [
      { memberId: '123', wikiAccount: 'Ironwestie', displayName: 'Ironwestie' }
    ];

    test('Message with masked, no embed template link', () => {
      const message = {
        content: 'Masked, no embed: [Template:Nickelodeon](<https://siivagunner.fandom.com/wiki/Template:Nickelodeon>)',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '*Fri, 21 Mar 2025 21:36:27 GMT: [[User:Ironwestie|Ironwestie]]: Masked, no embed: [[Template:Nickelodeon|Template:Nickelodeon]]'
      );
    });

    test('Message with masked, no embed category link', () => {
      const message = {
        content: 'Masked, no embed: [Category:Katamari Damacy](<https://siivagunner.fandom.com/wiki/Category:Katamari_Damacy>)',
        author: { id: '123' },
        timestamp: '2025-03-21T21:37:35.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '*Fri, 21 Mar 2025 21:37:35 GMT: [[User:Ironwestie|Ironwestie]]: Masked, no embed: [[:Category:Katamari Damacy|Category:Katamari Damacy]]'
      );
    });

    test('Message with masked, no embed regular link', () => {
      const message = {
        content: 'Masked, no embed: [Katamari Day](<https://siivagunner.fandom.com/wiki/Katamari_Day>)',
        author: { id: '123' },
        timestamp: '2025-03-21T21:38:42.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '*Fri, 21 Mar 2025 21:38:42 GMT: [[User:Ironwestie|Ironwestie]]: Masked, no embed: [[Katamari Day|Katamari Day]]'
      );
    });
  });
});