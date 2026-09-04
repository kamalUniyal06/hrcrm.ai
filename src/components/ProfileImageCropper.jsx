import { useState } from "react";
import Cropper from "react-easy-crop";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import getCroppedImg from "../services/cropImage"

export default function ProfileImageCropper({
    isOpen,
    image,
    onClose,
    onSave,
}) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const handleUpdate = async () => {
        try {
            const croppedImage = await getCroppedImg(
                image,
                croppedAreaPixels
            );

            onSave(croppedImage);
            onClose();

            toast.success("Profile updated");
        } catch (err) {
            console.error(err);
            toast.error("Failed to crop image");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-[500px] overflow-hidden">

                <div className="flex justify-between items-center px-5 py-4 border-b border-zinc-800">
                    <h2 className="text-white font-semibold">
                        Upload Image
                    </h2>

                    <button onClick={onClose}>
                        <X className="text-zinc-400" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="relative h-[420px] bg-black rounded-xl overflow-hidden">
                        <Cropper
                            image={image}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={(_, croppedPixels) =>
                                setCroppedAreaPixels(croppedPixels)
                            }
                        />
                    </div>

                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) =>
                            setZoom(Number(e.target.value))
                        }
                        className="w-full mt-4"
                    />
                </div>

                <div className="flex gap-3 p-4 border-t border-zinc-800">
                    <button
                        onClick={onClose}
                        className="flex-1 border border-zinc-700 rounded-xl py-2 text-white"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleUpdate}
                        className="flex-1 bg-white text-black rounded-xl py-2 font-medium"
                    >
                        Update
                    </button>
                </div>
            </div>
        </div>
    );
}