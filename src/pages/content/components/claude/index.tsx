import { useCallback, useEffect } from 'react';
import { useMessageHandler } from '../../shared/useMessageHandler';
import { waitForElement } from '../../shared/utils';
import { QuestionContent, buildChatText, sendAnswer } from '../../shared/question';

export const Claude = () => {
  const sendToChat = useCallback(
    async (content: QuestionContent, prompt: string, useTemporaryChat?: boolean) => {
            // Claude uses a ProseMirror contenteditable div
      const editor = await waitForElement('div[contenteditable="true"].ProseMirror') as HTMLElement
        ?? await waitForElement('div[contenteditable="true"]') as HTMLElement;
      if (!editor) {
        console.error('[GPT Web to API Claude] Could not find Claude input editor');
        return;
      }

      const text = buildChatText(content, prompt);

      // Set text in ProseMirror editor via execCommand (works in page world)
      editor.focus();
      editor.innerText = text;
      // Small delay then click Send
      window.setTimeout(async () => {
        // Claude's send button aria-label
        const sendBtn =
          (document.querySelector('button[aria-label="Send message"]') as HTMLButtonElement) ??
          (document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement);
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
        }
      }, 200);
    },
    []
  );

  useMessageHandler(sendToChat);

  useEffect(() => {
    // Inject Claude loader into page world
    const newScript = document.createElement('script');
    newScript.src = chrome.runtime.getURL('loader-claude.js');
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
