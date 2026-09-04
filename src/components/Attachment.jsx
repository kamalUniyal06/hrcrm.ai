import { Eye, Paperclip } from "lucide-react";
import { useRef, useState } from "react";
import AttachmentViewer from "./pages/threads/AttachmentViewer";
import IconButton from "./ui/Buttons/IconButton";

export default function Attachment({ data = [], onChange }) {
  const inputRef = useRef(null);
  const [filePreview, setFilePreview] = useState(false)

  const handleClick = () => {
    inputRef.current.click();
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    const filesWithUrl = selectedFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
    }));

    onChange((prev) => [...prev, ...filesWithUrl]);
    e.target.value = "";
  };

  return (
    <>
      <AttachmentViewer isOpen={filePreview} files={data} onClose={() => setFilePreview(false)} setFiles={onChange} />
      <div className="relative inline-flex group">
        {/* Hidden input */}
        <input
          ref={inputRef}
          type="file"
          // accept="image/*"
          multiple
          hidden
          onChange={handleFileChange}
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={handleClick}
          className="
          relative cursor-pointer
          flex items-center justify-center
          h-10 w-10 rounded-full
          bg-slate-800 text-slate-200
          hover:bg-slate-700 hover:text-white
          active:scale-95
          transition-all duration-200
        "
        >
          <Paperclip size={18} />

          {/* Badge */}
          {data.length > 0 && (
            <span
              className="
              absolute -top-1 -right-1
              min-w-[18px] h-[18px]
              px-1
              flex items-center justify-center
              rounded-full
              bg-red-500
              text-[10px] font-bold text-white
            "
            >
              {data.length}
            </span>
          )}
        </button>

        {/* Tooltip */}
        <span
          className="
          pointer-events-none absolute
          -top-9 left-1/2 -translate-x-1/2
          whitespace-nowrap
          rounded-md bg-black px-2 py-1
          text-xs text-white
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
        "
        >
          Add attachment
        </span>
        {data.length > 0 && <IconButton icon={Eye} onClick={() => setFilePreview(p => !p)} />
        }
      </div>
    </>

  );
}
