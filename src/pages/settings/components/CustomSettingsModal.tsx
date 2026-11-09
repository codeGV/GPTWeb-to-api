import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import type { Provider } from "@src/pages/background";
import { TemporaryChatToggle } from "./temporaryChat";

interface Props {
  onClose: () => void;
}

export const CustomSettingsModal = ({ onClose }: Props) => {
  const [provider, setProvider] = useState<Provider>("chatgpt");

  // Load current provider on mount
  useEffect(() => {
    chrome.runtime.sendMessage({ type: "get_provider" });
    const listener = (msg: any) => {
      if (msg.type === "set_provider") {
        setProvider(msg.content as Provider);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    chrome.runtime.sendMessage({ type: "set_provider", content: p });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Custom Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Provider selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI Provider
          </label>
          <div className="flex gap-3">
            {(
              [
                { id: "chatgpt", label: "ChatGPT", icon: "🤖", sublabel: "chat.openai.com" },
                { id: "claude", label: "Claude", icon: "🟣", sublabel: "claude.ai" },
                { id: "zai", label: "z.ai", icon: "🔵", sublabel: "chat.z.ai" },
              ] as { id: Provider; label: string; icon: string; sublabel: string }[]
            ).map(({ id, label, icon, sublabel }) => (
              <button
                key={id}
                onClick={() => handleProviderChange(id)}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                  provider === id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <span className="text-xl">{icon}</span>
                <div>
                  <p className={`text-sm font-medium ${provider === id ? "text-blue-700" : "text-gray-800"}`}>
                    {label}
                  </p>
                  <p className="text-xs text-gray-400">{sublabel}</p>
                </div>
                {provider === id && (
                  <span className="ml-auto text-blue-500 text-xs font-semibold">Active</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-5" />

        {/* Temporary Chat Toggle */}
        <div>
          <TemporaryChatToggle />
        </div>
      </div>
    </div>
  );
};
