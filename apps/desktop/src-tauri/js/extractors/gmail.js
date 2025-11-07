/**
 * Gmail Extractor
 *
 * Extracts emails and threads from Gmail web interface
 *
 * PRIVACY NOTE: This extractor respects user privacy by only extracting
 * emails that the user explicitly navigates to in the UI. No automatic
 * scanning of all emails.
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece Gmail] Extractor loaded for account:', config.accountId);

  // Gmail-specific selectors
  const SELECTORS = {
    // Email list items
    emailRow: 'tr.zA, div[role="main"] div[class*="zA"]',
    threadRow: 'tr[class*="ade"], tr[data-legacy-thread-id]',

    // Email details in list view
    sender: 'span[class*="yX xY"], span[email], span[class*="zF"]',
    subject: 'span[class*="bog"], div[class*="xT"] span',
    snippet: 'span[class*="y2"], div[class*="xW"]',
    time: 'span[class*="xW xX"], td[class*="xW"]',
    starred: 'span[class*="T-KT"]',
    important: 'span[class*="pG"]',
    attachment: 'span[class*="Y6"], img[alt="Attachment"]',
    label: 'span[class*="at"], div[class*="at"]',

    // Open email view
    openEmail: 'div[role="main"] div[class*="nH"]',
    emailSubject: 'h2[class*="hP"], span[class*="hP"]',
    emailSender: 'span[class*="gD"], span[email]',
    emailBody: 'div[class*="a3s"], div[class*="ii gt"]',
    emailTime: 'span[class*="g3"], td[class*="gH"]',
    emailAttachments: 'div[class*="hq gt"], div[class*="aQH"]',

    // Thread info
    threadCount: 'span[class*="bkL"]',
  };

  /**
   * Extract email ID from element or generate one
   */
  function getEmailId(element) {
    // Try to get from data attributes
    const dataId = element.getAttribute('data-legacy-thread-id') ||
                  element.getAttribute('data-thread-id') ||
                  element.getAttribute('data-message-id') ||
                  element.getAttribute('id');

    if (dataId) return `gmail_${dataId}`;

    // Try to extract from onclick or other attributes
    const onclickAttr = element.getAttribute('onclick');
    if (onclickAttr) {
      const match = onclickAttr.match(/thread-([a-f0-9]+)/);
      if (match) return `gmail_${match[1]}`;
    }

    // Fallback: generate from subject and sender
    const subjectEl = element.querySelector(SELECTORS.subject);
    const senderEl = element.querySelector(SELECTORS.sender);
    if (subjectEl) {
      const subject = utils.safeText(subjectEl).substring(0, 30);
      const sender = utils.safeText(senderEl);
      return `gmail_${sender.replace(/\W/g, '_')}_${subject.replace(/\W/g, '_')}_${Math.random().toString(36).substr(2, 9)}`;
    }

    return `gmail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract email information from list view
   */
  function extractEmailFromList(element) {
    const senderEl = element.querySelector(SELECTORS.sender);
    const subjectEl = element.querySelector(SELECTORS.subject);
    const snippetEl = element.querySelector(SELECTORS.snippet);
    const timeEl = element.querySelector(SELECTORS.time);
    const starredEl = element.querySelector(SELECTORS.starred);
    const importantEl = element.querySelector(SELECTORS.important);
    const attachmentEl = element.querySelector(SELECTORS.attachment);
    const labelEls = element.querySelectorAll(SELECTORS.label);
    const threadCountEl = element.querySelector(SELECTORS.threadCount);

    const labels = [];
    labelEls.forEach(label => {
      const labelText = utils.safeText(label);
      if (labelText) labels.push(labelText);
    });

    return {
      sender: utils.safeText(senderEl),
      subject: utils.safeText(subjectEl),
      snippet: utils.safeText(snippetEl),
      time: utils.safeText(timeEl),
      isStarred: !!starredEl,
      isImportant: !!importantEl,
      hasAttachment: !!attachmentEl,
      labels,
      threadCount: utils.safeText(threadCountEl),
    };
  }

  /**
   * Extract email information from open view
   */
  function extractOpenEmail() {
    const openEmailEl = document.querySelector(SELECTORS.openEmail);
    if (!openEmailEl) return null;

    const subjectEl = document.querySelector(SELECTORS.emailSubject);
    const senderEl = document.querySelector(SELECTORS.emailSender);
    const bodyEl = document.querySelector(SELECTORS.emailBody);
    const timeEl = document.querySelector(SELECTORS.emailTime);
    const attachmentsEl = document.querySelector(SELECTORS.emailAttachments);

    return {
      sender: utils.safeText(senderEl),
      subject: utils.safeText(subjectEl),
      body: utils.safeText(bodyEl),
      bodyHtml: bodyEl ? bodyEl.innerHTML : '',
      time: utils.safeText(timeEl),
      hasAttachment: !!attachmentsEl,
    };
  }

  /**
   * Parse Gmail relative time to timestamp
   */
  function parseGmailTime(timeText) {
    if (!timeText) return Date.now();

    const now = Date.now();
    const lower = timeText.toLowerCase();

    // Handle relative times
    if (lower.includes('minute') || lower.includes('min')) {
      const match = timeText.match(/(\d+)/);
      if (match) {
        return now - (parseInt(match[1]) * 60 * 1000);
      }
    } else if (lower.includes('hour') || lower.includes('hr')) {
      const match = timeText.match(/(\d+)/);
      if (match) {
        return now - (parseInt(match[1]) * 60 * 60 * 1000);
      }
    } else if (lower.includes('day')) {
      const match = timeText.match(/(\d+)/);
      if (match) {
        return now - (parseInt(match[1]) * 24 * 60 * 60 * 1000);
      }
    }

    // Try parsing as date
    const date = new Date(timeText);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }

    return now;
  }

  /**
   * Extract a single email as a post
   */
  function extractEmailPost(emailElement) {
    const emailId = getEmailId(emailElement);

    if (utils.isAlreadyExtracted(emailId)) {
      return null;
    }

    const email = extractEmailFromList(emailElement);
    if (!email.subject && !email.sender) return null; // Skip if no essential info

    // Build content
    let content = `📧 ${email.subject || '(No Subject)'}`;
    if (email.sender) {
      content += `\nFrom: ${email.sender}`;
    }
    if (email.snippet) {
      content += `\n\n${email.snippet}`;
    }
    if (email.hasAttachment) {
      content += '\n📎 Has attachments';
    }
    if (email.threadCount) {
      content += `\n💬 ${email.threadCount} messages`;
    }
    if (email.labels.length > 0) {
      content += `\n🏷️ ${email.labels.join(', ')}`;
    }

    const timestamp = parseGmailTime(email.time);

    const post = {
      id: emailId,
      author: email.sender || 'Unknown Sender',
      handle: email.sender?.split('@')[0]?.toLowerCase().replace(/\W/g, '_') || 'unknown',
      content,
      contentHtml: `<p><strong>📧 ${email.subject || '(No Subject)'}</strong></p>${email.sender ? `<p>From: ${email.sender}</p>` : ''}${email.snippet ? `<p>${email.snippet}</p>` : ''}`,
      metadata: {
        subject: email.subject,
        snippet: email.snippet,
        isStarred: email.isStarred,
        isImportant: email.isImportant,
        hasAttachment: email.hasAttachment,
        labels: email.labels,
        threadCount: email.threadCount,
        platform: 'gmail',
        type: 'email',
      },
      timestamp,
      type: 'email',
    };

    return utils.normalizePost(post);
  }

  /**
   * Process all emails in the current view
   */
  function processEmails() {
    const emailRows = document.querySelectorAll(SELECTORS.emailRow);
    const threadRows = document.querySelectorAll(SELECTORS.threadRow);

    const allElements = [...emailRows, ...threadRows];
    const emails = [];

    allElements.forEach(emailEl => {
      try {
        const email = extractEmailPost(emailEl);
        if (email) {
          emails.push(email);
        }
      } catch (err) {
        console.error('[Noteece Gmail] Error extracting email:', err);
      }
    });

    if (emails.length > 0) {
      console.log(`[Noteece Gmail] Extracted ${emails.length} emails`);
      utils.sendToBackend('posts_batch', emails);
    }

    // Also try to extract open email if viewing one
    try {
      const openEmail = extractOpenEmail();
      if (openEmail && openEmail.subject) {
        const emailId = `gmail_open_${openEmail.subject.replace(/\W/g, '_')}_${Date.now()}`;
        if (!utils.isAlreadyExtracted(emailId)) {
          const post = {
            id: emailId,
            author: openEmail.sender || 'Unknown Sender',
            handle: openEmail.sender?.split('@')[0]?.toLowerCase().replace(/\W/g, '_') || 'unknown',
            content: `📧 ${openEmail.subject}\n\n${openEmail.body.substring(0, 500)}`,
            contentHtml: openEmail.bodyHtml ? openEmail.bodyHtml.substring(0, 2000) : undefined,
            metadata: {
              subject: openEmail.subject,
              hasAttachment: openEmail.hasAttachment,
              platform: 'gmail',
              type: 'email',
            },
            timestamp: parseGmailTime(openEmail.time),
            type: 'email',
          };
          const normalized = utils.normalizePost(post);
          if (normalized) {
            console.log('[Noteece Gmail] Extracted open email');
            utils.sendToBackend('posts_batch', [normalized]);
          }
        }
      }
    } catch (err) {
      console.error('[Noteece Gmail] Error extracting open email:', err);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece Gmail] Initializing extractor');
    console.log('[Noteece Gmail] PRIVACY: Only extracting emails visible in the current view');

    // Process existing emails
    processEmails();

    // Watch for new emails as user navigates
    utils.observeElements(`${SELECTORS.emailRow}, ${SELECTORS.threadRow}`, (newEmails) => {
      console.log(`[Noteece Gmail] Detected ${newEmails.length} new/updated emails`);
      const extracted = [];

      newEmails.forEach(emailEl => {
        try {
          const email = extractEmailPost(emailEl);
          if (email) {
            extracted.push(email);
          }
        } catch (err) {
          console.error('[Noteece Gmail] Error extracting new email:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Periodic re-scan (less frequent for privacy)
    setInterval(() => {
      processEmails();
    }, 30000); // Every 30 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
