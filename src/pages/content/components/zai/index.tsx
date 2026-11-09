import { useCallback, useEffect } from 'react';
import { useMessageHandler } from '../../shared/useMessageHandler';
import { waitForElement } from '../../shared/utils';
import { QuestionContent, buildChatText, sendAnswer } from '../../shared/question';


export const Zai = () => {
  const sendToChat = useCallback(
    async (content: QuestionContent, prompt: string) => {
      const editor = await waitForElement('#chat-input') as HTMLTextAreaElement;

      if (!editor) {
        console.error('[GPT Web to API z.ai] Could not find z.ai input textarea');
        return;
      }

      const text = buildChatText(content, prompt);

      editor.focus();

      // Set value using native input setter to trigger React/Svelte change detection
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(editor, text);
      } else {
        editor.value = text;
      }
      editor.dispatchEvent(new Event('input', { bubbles: true }));

      window.setTimeout(async () => {
        const sendBtn =
          (document.querySelector('#send-message-button') as HTMLButtonElement) ??
          (document.querySelector('button[type="submit"]') as HTMLButtonElement);
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
        }
      }, 200);
    },
    []
  );

  useMessageHandler(sendToChat);

  useEffect(() => {
    const newScript = document.createElement('script');
    newScript.src = chrome.runtime.getURL('loader-zai.js');
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
