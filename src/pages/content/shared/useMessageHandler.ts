import { useEffect, useRef, useState } from 'react';
import { createPrompt } from './createPrompt';
import { QuestionContent, isTextMode } from './question';

/**
 * Shared hook for handling background messages (ask_question + set_settings).
 * The `onAskQuestion` callback receives the raw message content and a one-time
 * prompt string (only non-empty on the very first call, then empty thereafter).
 */
export const useMessageHandler = (
  onAskQuestion: (content: QuestionContent, prompt: string, useTemporaryChat?: boolean) => void
) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [method, setMethod] = useState('');
  const isInitialized = useRef(false);
  const promptRef = useRef(createPrompt('', ''));

  useEffect(() => {
    promptRef.current = createPrompt(selectedLanguage, method);
  }, [selectedLanguage, method]);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'get_settings' });

    const listener = (msg: any) => {
      if (msg.type === 'ask_question') {
        // Text-mode (OpenAI-compatible) questions carry their own prompt, so they
        // neither need nor consume the one-time role-play preamble.
        let prompt = '';
        if (!isTextMode(msg.content) && !isInitialized.current) {
          prompt = promptRef.current;
          isInitialized.current = true;
        }
        onAskQuestion(msg.content, prompt, msg.useTemporaryChat);
      } else if (msg.type === 'set_settings' && msg.content) {
        setSelectedLanguage(msg.content.language);
        setMethod(msg.content.method);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [onAskQuestion]);

  return { selectedLanguage, method };
};
