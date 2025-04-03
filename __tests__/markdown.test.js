import { processLinks, convertDiscordToWikitext } from '../markdown.js';
import { formatMessageToWikitext } from '../archive.js';

describe('Discord to Wikitext Conversion', () => {
  const authors = [
    { memberId: '123', wikiAccount: 'Ironwestie', displayName: 'Ironwestie' }
  ];

  describe('Links', () => {
    describe('Raw URLs in angle brackets', () => {
      test('Template links', () => {
        const input = '<https://siivagunner.fandom.com/wiki/Template:Nickelodeon>';
        expect(convertDiscordToWikitext(input, authors)).toBe('{{t|Nickelodeon}}');
      });

      test('Category links', () => {
        const input = '<https://siivagunner.fandom.com/wiki/Category:Katamari_Damacy>';
        expect(convertDiscordToWikitext(input, authors)).toBe('[[:Category:Katamari Damacy]]');
      });

      test('Regular wiki page links', () => {
        const input = '<https://siivagunner.fandom.com/wiki/Katamari_on_the_Rocks_-_Katamari_Damacy>';
        expect(convertDiscordToWikitext(input, authors)).toBe('[[Katamari on the Rocks - Katamari Damacy]]');
      });
    });

    describe('Masked links with angle brackets [text](<url>)', () => {
      test('Template links', () => {
        const input = '[Template:Nickelodeon](<https://siivagunner.fandom.com/wiki/Template:Nickelodeon>)';
        expect(convertDiscordToWikitext(input, authors)).toBe('[[Template:Nickelodeon|Template:Nickelodeon]]');
      });

      test('Category links', () => {
        const input = '[Category:Katamari Damacy](<https://siivagunner.fandom.com/wiki/Category:Katamari_Damacy>)';
        expect(convertDiscordToWikitext(input, authors)).toBe('[[:Category:Katamari Damacy|Category:Katamari Damacy]]');
      });

      test('Regular wiki page links', () => {
        const input = '[Katamari Day](<https://siivagunner.fandom.com/wiki/Katamari_Day>)';
        expect(convertDiscordToWikitext(input, authors)).toBe('[[Katamari Day|Katamari Day]]');
      });
    });

    describe('Regular markdown links [text](url)', () => {
      test('Template links', () => {
        const input = '[Custom name](https://siivagunner.fandom.com/wiki/Template:Nickelodeon)';
        expect(convertDiscordToWikitext(input, authors)).toBe('[[Template:Nickelodeon|Custom name]]');
      });

      test('Category links', () => {
        const input = '[Games](https://siivagunner.fandom.com/wiki/Category:Games)';
        expect(convertDiscordToWikitext(input, authors)).toBe('[[:Category:Games|Games]]');
      });

      test('Regular wiki page links', () => {
        const input = '[Cool rip](https://siivagunner.fandom.com/wiki/Katamari_Day)';
        expect(convertDiscordToWikitext(input, authors)).toBe('[[Katamari Day|Cool rip]]');
      });

      test('External links', () => {
        const input = '[YouTube](https://www.youtube.com)';
        expect(convertDiscordToWikitext(input, authors)).toBe('[https://www.youtube.com YouTube]');
      });
    });

    describe('Raw URLs', () => {
      test('Template links', () => {
        const input = 'https://siivagunner.fandom.com/wiki/Template:Nickelodeon';
        expect(convertDiscordToWikitext(input, authors)).toBe('{{t|Nickelodeon}}');
      });

      test('Category links', () => {
        const input = 'https://siivagunner.fandom.com/wiki/Category:Games';
        expect(convertDiscordToWikitext(input, authors)).toBe('[[:Category:Games]]');
      });

      test('Regular wiki page links', () => {
        const input = 'https://siivagunner.fandom.com/wiki/Katamari_Day';
        expect(convertDiscordToWikitext(input, authors)).toBe('[[Katamari Day]]');
      });
    });
  });

  describe('Text Formatting', () => {
    describe('Italics', () => {
      test('Italics with *', () => {
        const input = 'Italics: *Italics*';
        expect(convertDiscordToWikitext(input, authors)).toBe('Italics: \'\'Italics\'\'');
      });

      test('Italics with _', () => {
        const input = 'Italics: _Italics_';
        expect(convertDiscordToWikitext(input, authors)).toBe('Italics: \'\'Italics\'\'');
      });
    });

    describe('Bold', () => {
      test('Bold with **', () => {
        const input = 'Bold: **Bold**';
        expect(convertDiscordToWikitext(input, authors)).toBe('Bold: \'\'\'Bold\'\'\'');
      });

      test('Bold with italics ***', () => {
        const input = 'Bold with italics: ***Bold with italics***';
        expect(convertDiscordToWikitext(input, authors)).toBe('Bold with italics: \'\'\'\'\'Bold with italics\'\'\'\'\'');
      });

      test('Bold with italics **_', () => {
        const input = 'Bold with italics: **_Bold with italics_**';
        expect(convertDiscordToWikitext(input, authors)).toBe('Bold with italics: \'\'\'\'\'Bold with italics\'\'\'\'\'');
      });

      test('Bold with italics _**', () => {
        const input = 'Bold with italics: _**Bold with italics**_';
        expect(convertDiscordToWikitext(input, authors)).toBe('Bold with italics: \'\'\'\'\'Bold with italics\'\'\'\'\'');
      });
    });

    describe('Underline', () => {
      test('Underline with __', () => {
        const input = 'Underline: __Underline__';
        expect(convertDiscordToWikitext(input, authors)).toBe('Underline: <u>Underline</u>');
      });

      test('Underline with italics __*', () => {
        const input = 'Underline with italics: __*Underline with italics*__';
        expect(convertDiscordToWikitext(input, authors)).toBe('Underline with italics: <u>\'\'Underline with italics\'\'</u>');
      });

      test('Underline with bold __**', () => {
        const input = 'Underline with bold: __**Underline with bold**__';
        expect(convertDiscordToWikitext(input, authors)).toBe('Underline with bold: <u>\'\'\'Underline with bold\'\'\'</u>');
      });

      test('Underline with bold and italics __***', () => {
        const input = 'Underline with bold and italics: __***Underline with bold and italics***__';
        expect(convertDiscordToWikitext(input, authors)).toBe('Underline with bold and italics: <u>\'\'\'\'\'Underline with bold and italics\'\'\'\'\'</u>');
      });
    });

    describe('Strikethrough', () => {
      test('Strikethrough with ~~', () => {
        const input = 'Strikethrough: ~~Strikethrough~~';
        expect(convertDiscordToWikitext(input, authors)).toBe('Strikethrough: <s>Strikethrough</s>');
      });
    });

    describe('Inline code', () => {
      test('Code with `', () => {
        const input = 'Code: `Code`';
        expect(convertDiscordToWikitext(input, authors)).toBe('Code: <code>Code</code>');
      });
    });

    describe('Code block', () => {
      test('Code with ```', () => {
        const input = 'Code: ```Code```';
        expect(convertDiscordToWikitext(input, authors)).toBe('Code: <pre>Code</pre>');
      });
    });

    describe('Code block with multiple lines', () => {
      test('Code with ```', () => {
        const input = 'Code: ```Code\nCode```';
        expect(convertDiscordToWikitext(input, authors)).toBe('Code: <pre>Code\nCode</pre>');
      });
    });

    describe('Code block with multiple lines', () => {
      test('Code with ```', () => {
        const input = 'Code: ```\nCode\nCode\n```';
        expect(convertDiscordToWikitext(input, authors)).toBe('Code: <pre>Code\nCode</pre>');
      });
    });
  });

  describe('Lists', () => {
    test('Unordered list with dashes', () => {
      const input = '- Item 1\n- Item 2\n  - Subitem 2.1';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '\n* Item 1\n* Item 2\n** Subitem 2.1'
      );
    });

    test('Unordered list with asterisks', () => {
        const input = '* Item 1\n* Item 2\n  * Subitem 2.1';
        expect(convertDiscordToWikitext(input, authors)).toBe(
          '\n* Item 1\n* Item 2\n** Subitem 2.1'
        );
    });

    test('Unordered list with indentations', () => {
      const input = '- List of stuff\n  - and things\n  * and more things';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '\n* List of stuff\n** and things\n** and more things'
      );
    });

    test('Unordered list with multiple levels of indentations', () => {
      const input = '* First\n  * indent level 1\n  * indent level 1\n    * indent level 2\n    * indent level 2\n  * indent level 1\n* Second';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '\n* First\n** indent level 1\n** indent level 1\n*** indent level 2\n*** indent level 2\n** indent level 1\n* Second'
      );
    });

    test('Ordered list', () => {
      const input = '1. First\n2. Second\n  1. Subsecond';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '\n# First\n# Second\n## Subsecond'
      );
    });

    test('Ordered list with multiple levels of indentations', () => {
      const input = '1. First\n  1. Subfirst\n  2. Subsecond\n2. Second\n  1. Subfirst\n  2. Subsecond';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '\n# First\n## Subfirst\n## Subsecond\n# Second\n## Subfirst\n## Subsecond'
      );
    });
  });

  describe('Quotes', () => {
    test('Single line quote', () => {
      const input = '> This is a quote';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '<blockquote>This is a quote</blockquote>'
      );
    });

    test('Multi-line quote', () => {
      const input = '> First line\n> Second line';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '<blockquote>First line\nSecond line</blockquote>'
      );
    });

    test('Mix of multiline and single line quotes', () => {
      const input = 'Not Quote\n> Quote\n> More quote\nNot quote\n> quote\nNot quote\n> Multiline quote line\n> Multiline quote line 2\nNot quote';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        'Not Quote\n<blockquote>Quote\nMore quote</blockquote>\nNot quote\n<blockquote>quote</blockquote>\nNot quote\n<blockquote>Multiline quote line\nMultiline quote line 2</blockquote>\nNot quote'
      );
    });

    test('Quote at beginning of message', () => {
      const input = '> Quote at beginning\nNot quote';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '<blockquote>Quote at beginning</blockquote>\nNot quote'
      );
    });

    test('Quote with list', () => {
      const input = '> Quote\n> * Item 1 - some content \n> * Item 2 - some content';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '<blockquote>Quote\n* Item 1 - some content\n* Item 2 - some content</blockquote>'
      );
    });

  });

  describe('User Mentions', () => {
    test('User mention', () => {
      const input = 'Hello <@123>!';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        'Hello [[User:Ironwestie|Ironwestie]]!'
      );
    });

    test('Unknown user mention', () => {
      const input = 'Hello <@456>!';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        'Hello <@456>!'
      );
    });
  });

  describe('Headings', () => {
    test('Heading with one hash', () => {
      const input = '# Heading';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '{{Fake heading|h2|Heading}}'
      );
    });

    test('Heading with two hashes', () => {
      const input = '## Heading';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '{{Fake heading|h3|Heading}}'
      );
    });

    test('Heading with three hashes', () => {
      const input = '### Heading';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '{{Fake heading|h4|Heading}}'
      );
    });

    test('Heading with four hashes', () => {
      const input = '#### Heading';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '#### Heading'
      );
    });
  });

  describe('Voting emojis', () => {
    test('Simple emoji', () => {
      const input = ':smile:';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        ':smile:'
      );
    });

    test('Support emoji', () => {
      const input = ':support:';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '[[File:Voting-support.svg|20px|link=]]'
      );
    });

    test('Neutral emoji', () => {
      const input = ':neutral:';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '[[File:Voting-neutral.svg|20px|link=]]'
      );
    });

    test('Oppose emoji', () => {
      const input = ':oppose:';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '[[File:Voting-oppose.svg|20px|link=]]'
      );
    });

    test('Restructure emoji', () => {
      const input = ':restructure:';
      expect(convertDiscordToWikitext(input, authors)).toBe(
        '[[File:Voting-restructure.svg|20px|link=]]'
      );
    });
  });

  describe('Full Message Formatting', () => {
    test('Message with quotes', () => {
      const message = {
        content: '> Quote',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=<blockquote>Quote</blockquote>}}'
      );
    });
    test('Pin message', () => {
      const message = {
        content: '',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z',
        type: 6
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        `{{DiscordLog2|class=system-message|t2= 21:36|1=Ironwestie|2=pinned '''a message''' to this channel. See all '''pinned messages'''}}`
      );
    });

    test('Message with multiple lines', () => {
      const message = {
        content: 'First line\nSecond line',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=First line\nSecond line}}'
      );
    });

    test('Message with masked, no embed template link', () => {
      const message = {
        content: 'Masked, no embed: [Template:Nickelodeon](<https://siivagunner.fandom.com/wiki/Template:Nickelodeon>)',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=Masked, no embed: [[Template:Nickelodeon|Template:Nickelodeon]]}}'
      );
    });

    test('Message with masked, no embed category link', () => {
      const message = {
        content: 'Masked, no embed: [Category:Katamari Damacy](<https://siivagunner.fandom.com/wiki/Category:Katamari_Damacy>)',
        author: { id: '123' },
        timestamp: '2025-03-21T21:37:35.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:37|1=Ironwestie|2=Masked, no embed: [[:Category:Katamari Damacy|Category:Katamari Damacy]]}}'
      );
    });

    test('Message with masked, no embed regular link', () => {
      const message = {
        content: 'Masked, no embed: [Katamari Day](<https://siivagunner.fandom.com/wiki/Katamari_Day>)',
        author: { id: '123' },
        timestamp: '2025-03-21T21:38:42.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:38|1=Ironwestie|2=Masked, no embed: [[Katamari Day|Katamari Day]]}}'
      );
    });

    test('Complex message with multiple elements', () => {
      const message = {
        content: '**Hello** <@123>!\n' +
          '1. First item with a [link](<https://siivagunner.fandom.com/wiki/Katamari_Day>)\n' +
          '2. Second item with *emphasis*\n' +
          '> A quote with __underline__',
        author: { id: '123' },
        timestamp: '2025-03-21T21:39:50.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:39|1=Ironwestie|2=' +
        "'''Hello''' [[User:Ironwestie|Ironwestie]]!\n" +
        '# First item with a [[Katamari Day|link]]\n' +
        "# Second item with ''emphasis''\n" +
        '<blockquote>A quote with <u>underline</u></blockquote>}}'
      );
    });
  });
});
