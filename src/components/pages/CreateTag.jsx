import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { createTag } from "../../store/Slices/tag";
import { fetchGpc } from "../../services/api";

const CreateTag = ({ onSubmit, onCancel, initialData, isEditing }) => {
  const dispatch = useDispatch();
  const { creating, error: reduxError } = useSelector((state) => state.tag);

  const [tagName, setTagName] = useState("");
  const [tagType, setTagType] = useState("");
  const [localError, setLocalError] = useState("");

  // ✅ Prefill data when editing
  useEffect(() => {
    if (initialData) {
      setTagName(initialData.name || "");
      setTagType(initialData.type || "");
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tagName.trim() || !tagType) {
      setLocalError("Please enter a tag name and tag type");
      return;
    }

    setLocalError("");

    try {
      if (isEditing) {
        const res = await fetchGpc({
          method: "PUT",
          params: { type: "tag_manager" },
          body: {
            id: initialData.id,
            tag_name: tagName,
            type: tagType,
          },
        });

        if (!res.success) {
          throw new Error(res.message || "Update failed");
        }
      } else {
        dispatch(createTag(tagName, tagType));
      }

      // ✅ callback after success
      if (onSubmit) {
        onSubmit(tagName, tagType);
      }
    } catch (err) {
      setLocalError(err.message || "Failed to process tag");
    }
  };

  const handleCancel = () => {
    setTagName("");
    setTagType("");
    setLocalError("");
    onCancel();
  };

  const error = reduxError || localError;

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Tag Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tag Name *
        </label>
        <input
          type="text"
          value={tagName}
          onChange={(e) => {
            setTagName(e.target.value);
            setLocalError("");
          }}
          placeholder="Enter tag name"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          required
          autoFocus
          disabled={creating}
        />
      </div>

      {/* Tag Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tag Type *
        </label>

        <select
          value={tagType}
          onChange={(e) => {
            setTagType(e.target.value);
            setLocalError("");
          }}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
          required
          disabled={creating}
        >
          <option value="">Select tag type</option>
          <option value="static">Static</option>
          <option value="dynamic">Dynamic</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          disabled={creating}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={creating || !tagName.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {creating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{isEditing ? "Updating..." : "Creating..."}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isEditing ? "Update Tag" : "Create Tag"}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default CreateTag;
