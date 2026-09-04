import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "./Header";
import { fetchGpc } from "../../../services/api";

const PromptExplorer = () => {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const { state } = useLocation();

  const isValid = systemPrompt.trim() && userPrompt.trim();

  const handleSubmit = async (sysOverride, userOverride) => {
    const sys = sysOverride ?? systemPrompt;
    const usr = userOverride ?? userPrompt;

    if (!sys.trim() || !usr.trim()) return;

    try {
      setLoading(true);
      setResponse("");

      const data = await fetchGpc({
        method: "POST", params: { type: 'prompt_explorer' }, body: {
          system_prompt: sys,
          user_prompt: usr,
        },
      }

      );

      setResponse(data || "No response received");
    } catch (err) {
      console.error(err);
      setResponse("❌ Error fetching response");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill and auto-run when navigated from Debug
  useEffect(() => {
    if (state?.system && state?.user) {
      setSystemPrompt(state.system);
      setUserPrompt(state.user);
      handleSubmit(state.system, state.user);
    }
  }, []);

  return (
    <div className="h-full w-full bg-gray-100 flex justify-center py-8 px-4">
      <div className="w-full max-w-5xl space-y-6">
        <Header text="Prompt Explorer" />

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900">
            Prompt Explorer
          </h1>
          <p className="text-sm text-gray-500">
            Test and evaluate system + user prompts in real time
          </p>
        </div>

        {/* Prompt Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 shadow-sm">
          {/* System Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 tracking-wide">
              SYSTEM PROMPT
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define AI behavior..."
              rows={4}
              className="w-full p-3 text-sm border border-gray-300 rounded-xl bg-gray-50 
              focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 
              focus:border-indigo-500 transition-all duration-200"
            />
          </div>

          {/* User Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 tracking-wide">
              USER PROMPT
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Ask something..."
              rows={4}
              className="w-full p-3 text-sm border border-gray-300 rounded-xl bg-gray-50 
              focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 
              focus:border-purple-500 transition-all duration-200"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-400">
              {isValid ? "Ready to run" : "Fill both prompts"}
            </div>

            <button
              onClick={() => handleSubmit()}
              disabled={!isValid || loading}
              className="px-5 py-2.5 text-sm font-medium rounded-xl 
              bg-gray-900 text-white hover:bg-gray-800 
              active:scale-[0.98] transition-all duration-150 
              disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Running..." : "Run Prompt"}
            </button>
          </div>
        </div>

        {/* Response Section */}
        {(loading || response) && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
              <span className="text-xs font-semibold text-gray-500 tracking-wide">
                RESPONSE
              </span>
              {loading && (
                <span className="text-xs text-indigo-500 animate-pulse">
                  Processing...
                </span>
              )}
            </div>

            {/* Body */}
            <div className="p-5">
              {loading ? (
                <div className="text-sm text-gray-400 animate-pulse">
                  Running prompt...
                </div>
              ) : (
                <pre className="text-sm text-gray-800 whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed">
                  {typeof response === "object"
                    ? JSON.stringify(response, null, 2)
                    : response}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptExplorer;
