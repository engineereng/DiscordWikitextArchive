import { formatMessageToWikitext, formatMessageWithContext, formatMessagesWithContext } from '../archive.js';

describe('Message Formatting', () => {
  const authors = [
    { memberId: '123', wikiAccount: 'Ironwestie', displayName: 'Ironwestie' },
    { memberId: '456', wikiAccount: 'TestUser', displayName: 'Test User' }
  ];

  describe('Basic Message Formatting', () => {
    test('Simple message with verified author', () => {
      const message = {
        content: 'Hello world!',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=Hello world!}}'
      );
    });

    test('Message with unverified author', () => {
      const message = {
        content: 'Hello world!',
        author: { id: '789', username: 'UnknownUser' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=UnknownUser|2=Hello world!}}'
      );
    });

    test('Empty message', () => {
      const message = {
        content: '',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie}}'
      );
    });
  });

  describe('Message Types', () => {
    test('Reply message', () => {
      const message = {
        content: 'This is a reply',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors, true)).toBe(
        '{{DiscordLog2|class=ping reply|1=Ironwestie|2=This is a reply}}'
      );
    });

    test('Forwarded message', () => {
      const message = {
        content: 'This is a forwarded message',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors, false, true)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=<blockquote>\'\'Forwarded:\'\'\nThis is a forwarded message</blockquote>}}'
      );
    });

    test('Reply+Forwarded message', () => {
      const message = {
        content: 'This is a reply+forwarded message',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors, true, true)).toBe(
        '{{DiscordLog2|class=ping reply|1=Ironwestie|2=<blockquote>\'\'Forwarded:\'\'\nThis is a reply+forwarded message</blockquote>}}'
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
        '{{DiscordLog2|class=system-message|t2= 21:36|1=Ironwestie|2=pinned \'\'\'a message\'\'\' to this channel. See all \'\'\'pinned messages\'\'\'}}'
      );
    });
  });

  describe('Message Content Types', () => {
    test('Message with embeds', () => {
      const message = {
        content: 'Message with embed',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z',
        embeds: [
          {
            title: 'Embed Title',
            description: 'Embed Description',
            url: 'https://example.com'
          }
        ]
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=Message with embed}}'
      );
    });

    test('Message with attachments', () => {
      const message = {
        content: 'Message with attachment',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z',
        attachments: [
          {
            url: 'https://example.com/image.png'
          }
        ]
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=Message with attachment}}'
      );
    });
  });

  describe('Date Formatting', () => {
    test('Simple date format (default)', () => {
      const message = {
        content: 'Message with simple date',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=Message with simple date}}'
      );
    });

    test('Full date format', () => {
      const message = {
        content: 'Message with full date',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors, false, false, false)).toBe(
        '{{DiscordLog2|t=Fri, 21 Mar 2025 21:36:27 GMT|1=Ironwestie|2=Message with full date}}'
      );
    });
  });

  describe('Complex Messages', () => {
    test('Message with multiple features', () => {
      const message = {
        content: '**Bold text** with a [link](https://siivagunner.fandom.com/wiki/Katamari_Day)',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z',
        embeds: [
          {
            title: 'Embed Title',
            description: 'Embed Description'
          }
        ],
        attachments: [
          {
            url: 'https://example.com/image.png'
          }
        ]
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=\'\'\'Bold text\'\'\' with a [[Katamari Day|link]]}}'
      );
    });

    test('Multi-line message with formatting', () => {
      const message = {
        content: 'First line\n**Second line**\n> Quote\n- List item',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=First line\n\'\'\'Second line\'\'\'\n<blockquote>Quote</blockquote>\n* List item}}'
      );
    });
  });

  describe('Edge Cases', () => {
    test('Message with special characters in content', () => {
      const message = {
        content: 'Message with | and } characters',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageToWikitext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=Message with {{!}} and } characters}}'
      );
    });

    test('Message with very long content', () => {
      const message = {
        content: 'A'.repeat(1000), // Very long message
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      const result = formatMessageToWikitext(message, authors);
      expect(result).toContain('{{DiscordLog2|t= 21:36|1=Ironwestie|2=');
      expect(result).toContain('A'.repeat(1000));
      expect(result).toContain('}}');
    });
  });

  describe('Message Context Formatting', () => {
    test('Reply to normal message', () => {
      const message = {
        type: 19,
        content: 'This is a reply',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z',
        referenced_message: {
          content: 'Original message',
          author: { id: '456' },
          timestamp: '2025-03-21T21:35:27.000Z'
        }
      };
      expect(formatMessageWithContext(message, authors)).toBe(
        '{{DiscordLog2|class=ping reply|1=TestUser|2=Original message}}\n' +
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a reply}}'
      );
    });

    test('Reply to forwarded message', () => {
      const message = {
        type: 19,
        content: 'This is a reply to a forwarded message',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z',
        referenced_message: {
          content: 'Forwarded content',
          author: { id: '456' },
          timestamp: '2025-03-21T21:35:27.000Z',
          message_snapshots: [{
            message: {
              content: 'Original forwarded content',
              timestamp: '2025-03-21T21:35:27.000Z'
            }
          }]
        }
      };
      expect(formatMessageWithContext(message, authors)).toBe(
        '{{DiscordLog2|class=ping reply|1=TestUser|2=<blockquote>\'\'Forwarded:\'\'\nOriginal forwarded content</blockquote>}}\n' +
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a reply to a forwarded message}}'
      );
    });

    test('Reply without referenced message', () => {
      const message = {
        type: 19,
        content: 'This is a reply without reference',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageWithContext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a reply without reference}}'
      );
    });

    test('Forwarded message', () => {
      const message = {
        content: 'Forwarding a message',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z',
        message_reference: { type: 1 },
        message_snapshots: [{
          message: {
            content: 'Original message being forwarded',
            timestamp: '2025-03-21T21:35:27.000Z'
          }
        }]
      };
      expect(formatMessageWithContext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:35|1=Ironwestie|2=<blockquote>\'\'Forwarded:\'\'\nOriginal message being forwarded</blockquote>}}'
      );
    });

    test('Normal message', () => {
      const message = {
        content: 'This is a normal message',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageWithContext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a normal message}}'
      );
    });
  });

  describe('Messages across different dates', () => {
    test('Message from the same day', () => {
      const message = {
        content: 'This is a message from today',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      const message2 = {
        content: 'This is a message from today as well',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessageWithContext(message, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from today}}'
      );
      expect(formatMessageWithContext(message2, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from today as well}}'
      );
      expect(formatMessagesWithContext([message, message2], authors)).toBe(
        '{{DiscordLog2|class=date-separator|t=March 21, 2025}}\n' +
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from today}}\n' +
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from today as well}}'
      );
    });

    test('Message from today and one from yesterday', () => {
      const todayMessage = {
        content: 'This is a message from today',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      const yesterdayMessage = {
        content: 'This is a message from yesterday',
        author: { id: '123' },
        timestamp: '2025-03-20T21:36:27.000Z'
      };
      expect(formatMessageWithContext(yesterdayMessage, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from yesterday}}'
      );
      expect(formatMessageWithContext(todayMessage, authors)).toBe(
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from today}}'
      );
      expect(formatMessagesWithContext([yesterdayMessage, todayMessage], authors)).toBe(
        '{{DiscordLog2|class=date-separator|t=March 20, 2025}}\n' +
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from yesterday}}\n' +
        '{{DiscordLog2|class=date-separator|t=March 21, 2025}}\n' +
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from today}}'
      );
    });

    test('Four messages from different dates', () => {
      const message1 = {
        content: 'This is a message from three days ago',
        author: { id: '123' },
        timestamp: '2025-03-18T21:36:27.000Z'
      };
      const message2 = {
        content: 'This is a message from two days ago',
        author: { id: '123' },
        timestamp: '2025-03-19T21:36:27.000Z'
      };
      const message3 = {
        content: 'This is a message from yesterday',
        author: { id: '123' },
        timestamp: '2025-03-20T21:36:27.000Z'
      };
      const message4 = {
        content: 'This is a message from today',
        author: { id: '123' },
        timestamp: '2025-03-21T21:36:27.000Z'
      };
      expect(formatMessagesWithContext([message1, message2, message3, message4], authors)).toBe(
        '{{DiscordLog2|class=date-separator|t=March 18, 2025}}\n' +
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from three days ago}}\n' +
        '{{DiscordLog2|class=date-separator|t=March 19, 2025}}\n' +
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from two days ago}}\n' +
        '{{DiscordLog2|class=date-separator|t=March 20, 2025}}\n' +
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from yesterday}}\n' +
        '{{DiscordLog2|class=date-separator|t=March 21, 2025}}\n' +
        '{{DiscordLog2|t= 21:36|1=Ironwestie|2=This is a message from today}}'
      );
    });
  });
});