import MarkdownIt from 'markdown-it';

// Initialize markdown-it with custom rendering rules for MediaWiki format
const md = new MarkdownIt({
  html: true  // Enable HTML to support underline and small tags
});

// Disable markdown-it's list, heading, and quote processing
md.disable(['list', 'heading', 'blockquote']);

// Customize rendering rules for MediaWiki format
md.renderer.rules.strong_open = () => "'''";
md.renderer.rules.strong_close = () => "'''";
md.renderer.rules.em_open = () => "''";
md.renderer.rules.em_close = () => "''";
md.renderer.rules.code_inline = (tokens, idx) => `<code>${tokens[idx].content}</code>`;
md.renderer.rules.fence = (tokens, idx) => `<blockquote>${tokens[idx].content}</blockquote>`;
md.renderer.rules.code_block = (tokens, idx) => `<pre>${tokens[idx].content}</pre>`;

// List rendering rules for MediaWiki format
md.renderer.rules.bullet_list_open = () => '';
md.renderer.rules.bullet_list_close = () => '';
md.renderer.rules.ordered_list_open = () => '';
md.renderer.rules.ordered_list_close = () => '';

md.renderer.rules.list_item_open = (tokens, idx) => {
  try {
    // Get the current token and its parent
    const token = tokens[idx];
    const parent = token?.parent;

    // Determine if we're in an ordered list
    const isOrdered = parent?.type === 'ordered_list';

    // Calculate nesting level by counting list parents
    let level = 1;  // Start at 1 since we're already in a list
    let current = parent;
    while (current?.parent) {
      if (current.parent.type === 'bullet_list' || current.parent.type === 'ordered_list') {
        level++;
      }
      current = current.parent;
    }

    // For ordered lists, cap at level 2 (# or ##)
    if (isOrdered) {
      level = Math.min(2, level);
    }

    // For ordered lists, use '#', for unordered use '*'
    const marker = isOrdered ? '#' : '*';

    // Add newline if needed
    const needsNewline = idx > 0 && tokens[idx - 1]?.type !== 'bullet_list_open' && tokens[idx - 1]?.type !== 'ordered_list_open';
    const prefix = needsNewline ? '\n' : '';

    return prefix + marker.repeat(level) + ' ';
  } catch (error) {
    console.error('Error in list_item_open:', error);
    return '* '; // Fallback to simple bullet point
  }
};

md.renderer.rules.list_item_close = (tokens, idx) => {
  try {
    // Add newline if this isn't the last item
    const nextToken = tokens[idx + 1];
    const isLastItem = !nextToken ||
      (nextToken.type !== 'list_item_open' &&
       nextToken.type !== 'bullet_list_close' &&
       nextToken.type !== 'ordered_list_close');

    return isLastItem ? '\n' : '';
  } catch (error) {
    console.error('Error in list_item_close:', error);
    return '\n'; // Fallback to newline
  }
};

// Process different types of links
export const processLinks = (content) => {
  // First handle markdown-style links with angle brackets [text](<url>)
  content = content.replace(/\[([^\]]+)\]\(<([^>]+)>\)/g, (match, text, url) => {
    // Template links
    if (url.match(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Template:/)) {
      const templateName = url.replace(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Template:/, '').replace(/_/g, ' ');
      return `[[Template:${templateName}|${text}]]`;
    }

    // Category links (need a : prefix to prevent categorization)
    if (url.match(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Category:/)) {
      const categoryName = url.replace(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Category:/, '').replace(/_/g, ' ');
      return `[[:Category:${categoryName}|${text}]]`;
    }

    // Interwiki links
    if (url.match(/^https:\/\/siivagunner\.fandom\.com\/wiki\//)) {
      const pageName = url.replace(/^https:\/\/siivagunner\.fandom\.com\/wiki\//, '').replace(/_/g, ' ');
      return `[[${pageName}|${text}]]`;
    }

    // External links
    if (!url.startsWith('https://siivagunner.fandom.com/')) {
      return `[${url} ${text}]`;
    }

    return match;
  });

  // Then handle raw URLs in angle brackets
  content = content.replace(/<(https:\/\/siivagunner\.fandom\.com\/wiki\/[^>]+)>/g, (match, url) => {
    // Template links
    if (url.match(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Template:/)) {
      const templateName = url.replace(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Template:/, '').replace(/_/g, ' ');
      return `{{t|${templateName}}}`;
    }

    // Category links (need a : prefix to prevent categorization)
    if (url.match(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Category:/)) {
      const categoryName = url.replace(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Category:/, '').replace(/_/g, ' ');
      return `[[:Category:${categoryName}]]`;
    }

    // Interwiki links
    if (url.match(/^https:\/\/siivagunner\.fandom\.com\/wiki\//)) {
      const pageName = url.replace(/^https:\/\/siivagunner\.fandom\.com\/wiki\//, '').replace(/_/g, ' ');
      return `[[${pageName}]]`;
    }

    return match;
  });

  // Then handle regular markdown-style links [text](url)
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    // Template links
    if (url.match(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Template:/)) {
      const templateName = url.replace(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Template:/, '').replace(/_/g, ' ');
      return `[[Template:${templateName}|${text}]]`;
    }

    // Category links (need a : prefix to prevent categorization)
    if (url.match(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Category:/)) {
      const categoryName = url.replace(/^https:\/\/siivagunner\.fandom\.com\/wiki\/Category:/, '').replace(/_/g, ' ');
      return `[[:Category:${categoryName}|${text}]]`;
    }

    // Interwiki links
    if (url.match(/^https:\/\/siivagunner\.fandom\.com\/wiki\//)) {
      const pageName = url.replace(/^https:\/\/siivagunner\.fandom\.com\/wiki\//, '').replace(/_/g, ' ');
      return `[[${pageName}|${text}]]`;
    }

    // External links
    if (!url.startsWith('https://siivagunner.fandom.com/')) {
      return `[${url} ${text}]`;
    }

    return match;
  });

  return content;
};

// Disable markdown-it's link processing
md.disable(['link']);

// Add custom token rule for text to handle raw URLs
md.renderer.rules.text = (tokens, idx) => {
  let content = tokens[idx].content;

  // Process raw URLs in text
  content = processLinks(content);

  return content;
};

// Disable markdown-it's list processing
md.disable(['list']);

// Add a custom block rule to prevent markdown-it from processing lists
md.block.ruler.before('list', 'custom_list', (state) => {
  // Check if the line starts with a list marker
  const line = state.src.split('\n')[state.line];
  if (line && line.match(/^(?:[-*]|\d+\.)\s+/)) {
    // Skip this line so markdown-it doesn't process it
    state.line++;
    return true;
  }
  return false;
});

// Custom processing functions
export const processUnderlineMarkdown = (content) => {
  // Handle __***text***__ (underline + bold + italic)
  content = content.replace(/__([\*]{3}(.*?)[\*]{3})__/g, '<u>\'\'\'\'\'$2\'\'\'\'\'</u>');

  // Handle __**text**__ (underline + bold)
  content = content.replace(/__([\*]{2}(.*?)[\*]{2})__/g, '<u>\'\'\'$2\'\'\'</u>');

  // Handle __*text*__ (underline + italic)
  content = content.replace(/__([\*](.*?)[\*])__/g, '<u>\'\'$2\'\'</u>');

  // Handle __text__ (just underline)
  content = content.replace(/__(.*?)__/g, '<u>$1</u>');

  return content;
};

export const processSubtext = (content) => {
  // Handle -# Subtext (convert to <small>Subtext</small>)
  return content.replace(/^-#\s+(.+)$/gm, '<small>$1</small>');
};

export const processLists = (content) => {
  const lines = content.split('\n');
  const processedLines = [];
  let inList = false;
  let firstIndentLevel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      processedLines.push('');
      continue;
    }

    // Check if this is a list item with indentation
    const unorderedMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)/);

    if (unorderedMatch || orderedMatch) {
      if (!inList) {
        inList = true;
        // Add blank line before list starts
        processedLines.push('');
      }

      // Get indentation and content
      const [, indent, content] = unorderedMatch || orderedMatch;

      // Count indentation level (Discord uses 2 spaces)
      const indentLevel = Math.floor(indent.length / 2);
    //   console.log("Line:", line);
    //   console.log("Indent length:", indent.length);
    //   console.log("Indent level:", indentLevel);

      // Store the first indent level we see
      if (firstIndentLevel === null) {
        firstIndentLevel = indentLevel;
      }

      // Adjust indent level relative to the first line
      const adjustedLevel = Math.max(0, indentLevel - firstIndentLevel);

      // For ordered lists, only use level 0 or 1
      // For unordered lists, use full indentation
      const finalLevel = orderedMatch
        ? (adjustedLevel > 0 ? 1 : 0)  // Ordered lists: only level 0 or 1
        : adjustedLevel;  // Unordered lists: full indentation

      // Create marker based on list type and indentation
      const marker = (orderedMatch ? '#' : '*').repeat(finalLevel + 1);

      // Add the processed line
      const processedLine = marker + ' ' + content;
    //   console.log("Processed line:", processedLine);
      processedLines.push(processedLine);
    } else {
      inList = false;
      processedLines.push(line);
    }
  }

  return processedLines.join('\n');
};

export const processHeadings = (content) => {
  return content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
    // For headers with 4 or more hashes, keep original format
    if (hashes.length >= 4) {
      return match;
    }
    // Add 1 to header level since Discord's # is h2 (h1 is reserved for page titles)
    const level = Math.min(6, hashes.length + 1);
    // Add spaces around text
    return `{{Fake heading|h${level}|${text}}}`;
  });
};

export const processQuotes = (content) => {
  return content.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');
};

export const processSpoilers = (content) => {
  return content.replace(/\|\|((?:\n|.)+?)\|\|/g, '<div class="spoiler">$1</div>');
};

export const processVotingEmojis = (content) => {
  const votingEmojis = {
    support: 'Voting-support.svg',
    neutral: 'Voting-neutral.svg',
    oppose: 'Voting-oppose.svg',
    restructure: 'Voting-restructure.svg'
  };

  return content.replace(/:([a-z]+):/g, (match, emojiName) => {
    if (votingEmojis[emojiName]) {
      return `[[File:${votingEmojis[emojiName]}|20px|link=]]`;
    }
    return match;
  });
};

export const processTemplates = (content) => {
  // Match both anonymous and named parameter templates
  return content.replace(/{{([^{}|]+)(\|[^{}]+)?}}/g, (match, templateName, parameters) => {
    // Remove any leading/trailing whitespace from template name
    templateName = templateName.trim();
    // Don't add 't|' if it's already a t template
    if (templateName.toLowerCase() === 't') {
      return match;
    }
    return `{{t|${templateName}${parameters || ''}}}`;
  });
};

export const processCode = (content) => {
  // Handle multiline code blocks
  content = content.replace(/```([\s\S]*?)```/g, (match, code) => {
    // Remove the first newline if it exists
    code = code.replace(/^\n/, '');
    // Remove the last newline if it exists
    code = code.replace(/\n$/, '');
    return `<pre>${code}</pre>`;
  });
  return content;
};

export const processInlineCode = (content) => {
  return content.replace(/`([^`]+)`/g, '<code>$1</code>');
};

// Helper functions for content detection
export const contentStartsWith = {
  list: (content) => content.match(/^([-*]|\d+\.)\s+/),
  quote: (content) => content.match(/^>\s+/),
};

export const contentContains = {
  list: (content) => content.match(/(?:^|\n)(?:[-*]|\d+\.)\s+/),
  quote: (content) => content.match(/^>\s+/m),
};

// Main markdown rendering function
export const renderContent = (content, { containsList, containsQuotes } = {}) => {
  if (!containsList && !containsQuotes) {
    return md.render(content)
      .replace(/<\/?p>/g, '')
      .replace(/\n$/, '');
  }
  return content;
};

/**
 * Convert Discord-formatted text to wikitext
 * @param {string} content The Discord-formatted text to convert
 * @param {Array} authors Array of verified members for @mention conversion
 * @param {boolean} forwarded Whether the message is a forwarded message
 * @returns {string} The converted wikitext
 */
export const convertDiscordToWikitext = (content, authors = [], forwarded = false) => {
  const startsWithList = contentStartsWith.list(content);
  // First process templates and links
  content = processTemplates(content);
  content = content.replace(/(?<!\|)\|(?!\|)/g, '{{!}}'); // replace pipe characters with {{!}}
  content = processLinks(content);

  // Process code blocks before other formatting
  content = processCode(content);
  content = processInlineCode(content);

  // Process headers
  content = processHeadings(content);

  // Process spoilers
  content = processSpoilers(content);

  // Process Discord-specific formatting
  content = content
    .replace(/^-#\s+(.+)$/gm, match => processSubtext(match))
    .replace(/__([\*]{3}.*?[\*]{3})__|__([\*]{2}.*?[\*]{2})__|__([\*].*?[\*])__|__(.*?)__/g, match => processUnderlineMarkdown(match))
    .replace(/<@!?(\d+)>/g, (match, id) => {
      const member = authors.find(m => m.memberId === id);
      return member ? `[[User:${member.wikiAccount}|${member.displayName}]]` : match;
    })
    .replace(/<#(\d+)>/g, '#$1')
    .replace(/<@&(\d+)>/g, '@$1')
    .replace(/<:([^:]+):(\d+)>/g, ':$1:')
    .replace(/(\=\=\=)/g, '<nowiki>$1</nowiki>');

  // Process voting emojis
  content = processVotingEmojis(content);

  // Split content into lines for processing
  let lines = content.split('\n');
  let processedLines = [];
  let quoteBlock = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const isQuote = line.match(/^>\s*(.+)$/);
    const unorderedMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)/);

    if (isQuote) {
      // Add to quote block
      quoteBlock.push(isQuote[1]);

      // Check if next line is also a quote
      const nextLine = lines[i + 1];
      const isNextQuote = nextLine && nextLine.match(/^>\s*(.+)$/);

      // If next line is not a quote, process the block
      if (!isNextQuote) {
        const renderedContent = quoteBlock.map(quote => {
          // Don't process markdown for list items in quotes
          if (quote.trim().startsWith('* ')) {
            return quote.trim();
          }
          return md.render(quote)
            .replace(/<\/?p>/g, '')
            .replace(/\n$/, '');
        }).join('\n');
        processedLines.push(`<blockquote>${renderedContent}</blockquote>`);
        quoteBlock = [];
      }
    } else if (unorderedMatch || orderedMatch) {
      const [, indent, itemContent] = unorderedMatch || orderedMatch;
      const indentLevel = Math.floor(indent.length / 2);

      // Render markdown for list item content
      const renderedContent = md.render(itemContent)
        .replace(/<\/?p>/g, '')
        .replace(/\n$/, '');

      // Create marker based on list type and indentation
      const marker = (orderedMatch ? '#' : '*').repeat(indentLevel + 1);
      processedLines.push(marker + ' ' + renderedContent);
    } else {
      // Process regular lines with markdown
      const renderedContent = md.render(line)
        .replace(/<\/?p>/g, '')
        .replace(/\n$/, '');
      processedLines.push(renderedContent);
    }
  }

  // Process raw URLs
  content = processedLines.join('\n')
    .replace(/https:\/\/siivagunner\.fandom\.com\/wiki\/Template:([^\s\]]+)/g, (match, templateName) => {
      return `{{t|${templateName.replace(/_/g, ' ')}}}`;
    })
    .replace(/https:\/\/siivagunner\.fandom\.com\/wiki\/Category:([^\s\]]+)/g, (match, categoryName) => {
      return `[[:Category:${categoryName.replace(/_/g, ' ')}]]`;
    })
    .replace(/https:\/\/siivagunner\.fandom\.com\/wiki\/([^\s\]]+)/g, (match, pageName) => {
      return `[[${pageName.replace(/_/g, ' ')}]]`;
    });

  if (forwarded) {
    content = `<blockquote>''Forwarded:''\n${content}</blockquote>`;
  } else if (startsWithList) {
    content = '\n' + content;
  }

  return content;
};

// Export markdown-it instance if needed elsewhere
export const markdownIt = md;