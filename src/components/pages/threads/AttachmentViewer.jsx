import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Trash2, Cross } from "lucide-react";

const getFileType = (type = "", name = "") => {
    if (type.startsWith("image")) return "image";
    if (type.startsWith("video")) return "video";
    if (type === "application/pdf") return "pdf";
    return "other";
};

const getFileUrl = (item) => {
    console.log(item)
    if (item.url) return item.url;
    if (item.file) return URL.createObjectURL(item.file);
    return URL.createObjectURL(item)
};

const AttachmentViewer = ({ files = [], setFiles, isOpen, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (isOpen) setCurrentIndex(0);
    }, [isOpen]);

    if (!isOpen || files.length === 0) return null;

    const currentFile = files[currentIndex];
    const url = getFileUrl(currentFile);
    const type = getFileType(currentFile.type, currentFile.name);

    const next = () => {
        setCurrentIndex((prev) => (prev + 1) % files.length);
    };

    const prev = () => {
        setCurrentIndex((prev) =>
            prev === 0 ? files.length - 1 : prev - 1
        );
    };

    // 🔥 REMOVE FILE
    const removeFile = () => {
        setFiles((prev) => {
            const updated = prev.filter((_, i) => i !== currentIndex);

            // adjust index after delete
            if (currentIndex >= updated.length && updated.length > 0) {
                setCurrentIndex(updated.length - 1);
            }

            // if no files left → close viewer
            if (updated.length === 0) {
                onClose();
            }

            return updated;
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40">

            {/* Close Viewer */}
            <button
                onClick={onClose}
                className="absolute top-5 left-5 z-50 bg-white/90 p-2 rounded-full"
            >
                <ChevronLeft size={22} />
            </button>

            {/* Delete Current File */}


            {/* Left Arrow */}
            {files.length > 1 && (
                <button
                    onClick={prev}
                    className="absolute left-5 z-50 bg-white/80 p-2 rounded-full"
                >
                    <ChevronLeft size={28} />
                </button>
            )}

            {/* Right Arrow */}
            {files.length > 1 && (
                <button
                    onClick={next}
                    className="absolute right-5 z-50 bg-white/80 p-2 rounded-full"
                >
                    <ChevronRight size={28} />
                </button>
            )}

            {/* Preview */}
            <div className="relative max-w-[90%] max-h-[85%] flex items-center justify-center">
                <button
                    onClick={removeFile}
                    className="absolute -top-3 -right-1 z-50 bg-gray-400 text-white p-1 rounded-xl"
                >
                    <X size={15} />
                </button>
                {type === "image" && (
                    <img
                        src={url}
                        alt={currentFile.name}
                        className="max-h-[80vh] rounded-xl shadow-xl"
                    />
                )}

                {type === "video" && (
                    <video
                        src={url}
                        controls
                        className="max-h-[80vh] rounded-xl shadow-xl"
                    />
                )}

                {type === "pdf" && (
                    <iframe
                        src={url}
                        title="pdf"
                        className="w-[80vw] h-[80vh] rounded-xl"
                    />
                )}

                {type === "other" && (
                    <div className="bg-white p-6 rounded-xl text-center">
                        <p className="text-lg font-semibold">{currentFile.name}</p>
                        <a href={url} download className="text-blue-500 mt-2 block">
                            Download File
                        </a>
                    </div>
                )}
            </div>

            {/* Counter */}
            <div className="absolute bottom-5 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {currentIndex + 1} / {files.length}
            </div>
        </div>
    );
};

export default AttachmentViewer;