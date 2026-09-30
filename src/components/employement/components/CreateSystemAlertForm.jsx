import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import he from "he";
import toast from "react-hot-toast";
import TinyEditor from "../../TinyEditor";
import { createSystemAlert } from "../api/systemAlerts.api";

export default function CreateSystemAlertForm({ onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState("editor");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createSystemAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      setName("");
      setDescription("");
      toast.success("Alert created. Employees can now respond.");
      onCreated();
    },
  });
  const html = DOMPurify.sanitize(he.decode(description), {
    USE_PROFILES: { html: true },
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({ name, description: html });
      }}
      className="space-y-5"
    >
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <label htmlFor="alert-name" className="text-sm font-semibold">
          Alert title <span className="text-destructive">*</span>
        </label>
        <input
          id="alert-name"
          required
          value={name}
          disabled={mutation.isPending}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Holiday work availability"
          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Use a clear title employees will recognize in Action required.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="text-sm font-semibold">Alert description</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Write your message or paste an existing HTML template.
            </p>
          </div>
          <div
            className="flex rounded-lg bg-muted p-1"
            role="group"
            aria-label="Description view"
          >
            {["editor", "html", "preview"].map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
                className={`rounded-md px-3 py-2 text-xs font-medium ${mode === item ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
              >
                {item === "html"
                  ? "HTML"
                  : item === "editor"
                    ? "Write"
                    : "Preview"}
              </button>
            ))}
          </div>
        </div>
        <fieldset disabled={mutation.isPending} className="min-w-0 p-4">
          {mode === "editor" ? (
            <div className="min-h-[600px]">
              <TinyEditor
                height={600}
                minHeight={400}
                editorContent={description}
                setEditorContent={setDescription}
              />
            </div>
          ) : mode === "html" ? (
            <textarea
              aria-label="Alert HTML description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Paste HTML here..."
              className="min-h-[400px] w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-sm"
            />
          ) : (
            <div
              className="min-h-[400px] overflow-auto break-words [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
              dangerouslySetInnerHTML={{
                __html: html || "<p>Your alert preview will appear here.</p>",
              }}
            />
          )}
        </fieldset>
      </div>
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <p className="max-w-md text-sm text-muted-foreground">
          Creating this alert makes it available to employees for a Yes or No
          response.
        </p>
        <button
          disabled={mutation.isPending || !name.trim() || !html.trim()}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {mutation.isPending ? "Creating..." : "Create alert"}
        </button>
      </div>
    </form>
  );
}
