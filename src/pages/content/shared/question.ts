// Shape of a question forwarded from the server.
// - Legacy requests: `route` + `body`; the model is asked to write the API JSON itself.
// - OpenAI-compatible requests (`responseMode: 'text'`): `prompt` is typed as-is and the
//   plain answer text is returned; the server builds the OpenAI response envelope.
export type QuestionContent = {
  route: string;
  body: object;
  prompt?: string;
  responseMode?: 'text';
};

export const isTextMode = (content: QuestionContent) =>
  content.responseMode === 'text' && typeof content.prompt === 'string';

let expectTextAnswer = false;

/** Builds the text to type into the chat UI and remembers which answer format to send back. */
export const buildChatText = (content: QuestionContent, preamble: string): string => {
  expectTextAnswer = isTextMode(content);
  if (expectTextAnswer) return content.prompt as string;
  return `${preamble ? preamble + '\n' : ''}Route: ${content.route}\nPayload: ${JSON.stringify(content.body)}`;
};

/** Sends the captured answer to the background: raw text in text mode, parsed JSON otherwise. */
export const sendAnswer = (data: unknown, text: unknown) => {
  if (expectTextAnswer) {
    if (typeof text === 'string' && text) {
      chrome.runtime.sendMessage({ type: 'question_answer', content: { text } });
    }
    return;
  }
  if (data) {
    chrome.runtime.sendMessage({ type: 'question_answer', content: data });
  }
};
