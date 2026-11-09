import { useEffect, useState } from "react";
import { Server, Check, Loader2, Plug, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { normalizeServerUrl, type ServerConfig } from "@src/pages/config";

type TestState =
  | { state: "idle" }
  | { state: "testing" }
  | { state: "ok" }
  | { state: "fail"; message: string };

/** Checks that an GPT Web to API (Socket.IO) server answers at the given base URL. */
const testServer = async (baseUrl: string): Promise<TestState> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${baseUrl}socket.io/?EIO=4&transport=polling`, {
      signal: controller.signal,
    });
    const body = await res.text();
    return res.ok && body.includes('"sid"')
      ? { state: "ok" }
      : { state: "fail", message: `Server answered, but not as an GPT Web to API server (HTTP ${res.status}).` };
  } catch {
    return { state: "fail", message: "Could not reach the server." };
  } finally {
    clearTimeout(timer);
  }
};

export const ServerUrlSection = () => {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [mode, setMode] = useState<"default" | "custom">("default");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestState>({ state: "idle" });

  useEffect(() => {
    const listener = (msg: any) => {
      if (msg.type === "set_server_config" && msg.content) {
        const next = msg.content as ServerConfig;
        setConfig(next);
        setMode(next.customUrl ? "custom" : "default");
        setInput(next.customUrl ?? "");
        setError("");
      } else if (msg.type === "server_config_error") {
        setError(msg.content);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({ type: "get_server_config" });
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const chooseDefault = () => {
    setMode("default");
    setError("");
    setTest({ state: "idle" });
    if (config?.customUrl) {
      chrome.runtime.sendMessage({ type: "set_api_base_url", content: "" });
      flashSaved();
    }
  };

  const chooseCustom = () => {
    setMode("custom");
    setTest({ state: "idle" });
  };

  const saveCustom = () => {
    const url = normalizeServerUrl(input);
    if (!url) {
      setError("Enter a valid http:// or https:// URL, e.g. http://localhost:3000");
      return;
    }
    setError("");
    setInput(url);
    chrome.runtime.sendMessage({ type: "set_api_base_url", content: url });
    flashSaved();
  };

  const runTest = async () => {
    const url = mode === "custom" ? normalizeServerUrl(input) : config?.defaultUrl;
    if (!url) {
      setError("Enter a valid http:// or https:// URL, e.g. http://localhost:3000");
      return;
    }
    setError("");
    setTest({ state: "testing" });
    setTest(await testServer(url));
  };

  const customChanged =
    mode === "custom" && normalizeServerUrl(input) !== config?.customUrl;

  const optionClass = (active: boolean) =>
    clsx(
      "w-full flex items-start gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left",
      active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
    );

  const radio = (active: boolean) => (
    <span
      className={clsx(
        "mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
        active ? "border-blue-500" : "border-gray-300"
      )}
    >
      {active && <span className="w-2 h-2 rounded-full bg-blue-500" />}
    </span>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Server className="text-gray-700" size={24} />
            <h2 className="text-2xl font-semibold text-gray-900">Server</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Choose which GPT Web to API server this extension connects to. Changes apply
            immediately, no rebuild needed.
          </p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-medium text-green-600 whitespace-nowrap">
            <Check size={16} /> Saved
          </span>
        )}
      </div>

      <div className="space-y-3">
        <button type="button" onClick={chooseDefault} className={optionClass(mode === "default")}>
          {radio(mode === "default")}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">Default server</p>
            <p className="text-xs text-gray-500 font-mono break-all">
              {config?.defaultUrl ?? "…"}
            </p>
          </div>
        </button>

        <div className={optionClass(mode === "custom")}>
          <button type="button" onClick={chooseCustom} className="flex items-start gap-3 text-left">
            {radio(mode === "custom")}
          </button>
          <div className="flex-1 min-w-0">
            <button type="button" onClick={chooseCustom} className="text-left">
              <p className="text-sm font-medium text-gray-900">Custom server</p>
              <p className="text-xs text-gray-500">
                Your own or self-hosted GPT Web to API server.
              </p>
            </button>

            {mode === "custom" && (
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setTest({ state: "idle" });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && saveCustom()}
                  placeholder="http://localhost:3000"
                  autoFocus={!config?.customUrl}
                  className="flex-1 min-w-0 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={saveCustom}
                  disabled={!customChanged}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={16} /> {error}
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-600 flex-1 min-w-0">
          In use:{" "}
          <span className="font-mono text-gray-900 break-all">{config?.activeUrl ?? "…"}</span>
        </p>
        <button
          type="button"
          onClick={runTest}
          disabled={test.state === "testing"}
          className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-2 px-3 rounded-lg transition-colors"
        >
          {test.state === "testing" ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
          Test connection
        </button>
      </div>

      {test.state === "ok" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-green-600">
          <Check size={16} /> Server is reachable.
        </p>
      )}
      {test.state === "fail" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={16} /> {test.message}
        </p>
      )}
    </div>
  );
};
