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
md.renderer.rules.fence = (tokens, idx) => `<pre>${tokens[idx].content}</pre>`;
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

// Update link rendering to put URL first
md.renderer.rules.link_open = (tokens, idx) => {
  const href = tokens[idx].attrs.find(attr => attr[0] === 'href')[1];
  return `[${href} `;
};
md.renderer.rules.link_close = () => "]";

// Add custom token rule for link_text to skip it (we'll get it from content)
md.renderer.rules.text = (tokens, idx) => {
  // If this text token is inside a link, it's the display text
  if (tokens[idx].level === 1 && tokens[idx-1]?.type === 'link_open') {
    return tokens[idx].content;
  }
  // Otherwise render normally
  return tokens[idx].content;
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
      console.log("Line:", line);
      console.log("Indent length:", indent.length);
      console.log("Indent level:", indentLevel);

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
      console.log("Processed line:", processedLine);
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
    // Add 1 to header level since Discord's # is h2 (h1 is reserved for page titles)
    const level = Math.min(6, hashes.length + 1);
    return `<h${level}>${text}</h${level}>`;
  });
};

export const processQuotes = (content) => {
  return content.replace(/^>\s*(.+)$/gm, ' $1');
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

// Export markdown-it instance if needed elsewhere
export const markdownIt = md;