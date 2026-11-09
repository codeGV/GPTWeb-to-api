import { useCallback, useEffect } from 'react';
import { useMessageHandler } from '../../shared/useMessageHandler';
import { QuestionContent, buildChatText, sendAnswer } from '../../shared/question';

const findThinkingToggle = () => {
  const result = document.evaluate(
    "//button[.//span[normalize-space()='Think']]",
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );

  return result.singleNodeValue as HTMLElement;
};

type ThinkingEffort = 'high' | 'off';

const dispatchPointerEvents = (el: Element) => {
  const rect = el.getBoundingClientRect();
  const types = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'] as const;
  for (const t of types) {
    el.dispatchEvent(
      new PointerEvent(t, {
        bubbles: true,
        cancelable: true,
        clientX: rect.x + 5,
        clientY: rect.y + 5,
        button: 0,
      })
    );
  }
  (el as HTMLElement).click();
};

const clickThinkingToggle = (): boolean => {
  const toggle = findThinkingToggle();
  if (!toggle) return false;
  dispatchPointerEvents(toggle);
  return true;
};

const isThinkingToggleEnabled = (): boolean => {
  const toggle = findThinkingToggle();
  if (!toggle) return false;
  return toggle.getAttribute('aria-pressed') === 'true';
};

const resolveEffort = (req: ThinkingRequest): ThinkingEffort | null => {
  if (req === null) return 'off';
  const effort = req.effort;
  if (typeof effort === 'string') {
    const e = effort.toLowerCase();
    if (e === 'high') return 'high';
    return 'off';
  }
  return 'off';
};

type ThinkingRequest = { effort?: string | number | boolean | null; enabled?: boolean } | null;

const parseThinkingRequestBody = (body: object | undefined): ThinkingRequest => {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, undefined | string | { effort?: string }>;
  // Responses API: reasoning.effort
  const reasoning = b?.reasoning;
  if (reasoning && typeof reasoning === 'object' && reasoning.effort) {
    return { effort: reasoning.effort };
  }
  // Chat Completions: reasoning_effort
  if (typeof b?.reasoning_effort === 'string') {
    return { effort: b.reasoning_effort };
  }
  return { effort: 'off' }
};

const setThinking = async (req: ThinkingRequest): Promise<void> => {
  const effort = resolveEffort(req);
  if (effort === null) return;

  const thinkingEnabled = isThinkingToggleEnabled();
  if (effort === 'off') {
    if (thinkingEnabled) {
      clickThinkingToggle();
    }
    return;
  }

  if (effort === 'high' && !thinkingEnabled) {
    clickThinkingToggle();
  }
};

// ChatGPT's composer markup changes often; try the current layout first, then older ones.
const EDITOR_SELECTORS = [
  '#prompt-textarea',
  '.ProseMirror[contenteditable="true"]',
  'form [contenteditable="true"]',
];

const SEND_BUTTON_SELECTORS = [
  '#composer-submit-button',
  'button[data-testid="send-button"]',
  'form button[type="submit"]',
  'button[aria-label="Send"]',
];

const findEditor = (): HTMLElement | null => {
  for (const sel of EDITOR_SELECTORS) {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) return el;
  }
  return null;
};

const findSendButton = (): HTMLButtonElement | null => {
  for (const sel of SEND_BUTTON_SELECTORS) {
    const el = document.querySelector(sel) as HTMLButtonElement | null;
    if (el) return el;
  }
  return null;
};

const waitFor = <T,>(find: () => T | null, timeout: number): Promise<T | null> =>
  new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const found = find();
      if (found) return resolve(found);
      if (Date.now() - start > timeout) return resolve(null);
      setTimeout(check, 250);
    };
    check();
  });

const waitForSendButton = (timeout = 5000) =>
  waitFor(() => {
    const btn = findSendButton();
    return btn && !btn.disabled ? btn : null;
  }, timeout);

// Insert text through the browser's editing pipeline so the editor (ProseMirror) updates
// its own state, keeps line breaks and treats the payload as text, not HTML.
const fillEditor = (editor: HTMLElement, text: string) => {
  editor.focus();

  if (editor instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(editor, text);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  document.execCommand('selectAll');
  document.execCommand('delete');
  document.execCommand('insertText', false, text);

  if (!editor.innerText.trim()) {
    editor.textContent = text;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

export const ChatGPT = () => {
  const sendToChat = useCallback(
    async (content: QuestionContent, prompt: string, useTemporaryChat?: boolean) => {
      const thinkingReq = parseThinkingRequestBody(content.body);

      // A freshly opened tab may still be rendering the composer.
      const editor = await waitFor(findEditor, 15000);
      if (!editor) return;

      fillEditor(editor, buildChatText(content, prompt));

      if (thinkingReq) {
        await setThinking(thinkingReq);
      }

      const btn = await waitForSendButton();
      btn?.click();
    },
    []
  );

  useMessageHandler(sendToChat);

  useEffect(() => {
    const newScript = document.createElement('script');
    newScript.src = chrome.runtime.getURL('loader.js');
    document.body.appendChild(newScript);
    newScript.onload = () => {
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        const { data, text } = event.data || {};
        sendAnswer(data, text);
      });
    };
  }, []);

  return <div />;
};