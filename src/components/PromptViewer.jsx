import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const splitPromptSections = (prompt) => {
  if (!prompt) return [];

  return prompt
    .split(
      "----------------------------------------------------------------------",
    )
    .map((s) => s.trim())
    .filter(Boolean);
};

const TABS = [
  "System Prompt",
  "Role Prompt",
  "Overwrite Prompt",
  "Output / Styling",
  "Common Prompt",
  "Client Email",
  "Email Subject",
  "Email Body",
];

const PromptSectionsViewer = ({ prompt, onExplore }) => {
  const [activeTab, setActiveTab] = useState(0);

  const sections = useMemo(() => {
    return splitPromptSections(prompt);
  }, [prompt]);

  if (!sections.length) return null;

  const activeContent = sections[activeTab] || "";

  // create line numbers
  const lines = activeContent.split("\n");

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      {/* TOP TABS */}
      <div className="flex gap-6 px-4 pt-3 border-b text-sm">
        {sections.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`pb-2 ${
              activeTab === i
                ? "text-blue-600 border-b-2 border-blue-600 font-medium"
                : "text-gray-500"
            }`}
          >
            {TABS[i] || `Section ${i + 1}`}
          </button>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50 text-sm">
        <div className="flex justify-end w-full">
          <button
            onClick={() => navigator.clipboard.writeText(activeContent)}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            Copy
          </button>
          {onExplore && (
            <button
              onClick={() => onExplore(prompt)}
              className="px-3 py-1 ml-2 text-xs rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Explore
            </button>
          )}
        </div>
      </div>

      {/* CODE VIEW */}
      <div className="flex text-sm font-mono max-h-[500px] overflow-auto">
        {/* LINE NUMBERS */}
        <div className="bg-gray-100 text-gray-400 px-3 py-2 text-right select-none">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* CONTENT */}
        <pre className="flex-1 p-3 whitespace-pre-wrap text-gray-800">
          {activeContent}
        </pre>
      </div>
    </div>
  );
};

export default PromptSectionsViewer;
