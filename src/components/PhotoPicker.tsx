import { useRef, useState } from "react";
import { ImagePlus, Link2, Plus, Upload, X } from "lucide-react";
import { tjUploadImage } from "../lib/supabase";
import { Button, Field, Input } from "./ui";

export function PhotoPicker({
  photos,
  onChange,
  token,
  label = "Service Photos",
  hint = "Paste an image link or upload photos directly from your device.",
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  token: string;
  label?: string;
  hint?: string;
}) {
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addUrl = () => {
    const trimmed = photoUrl.trim();
    if (!trimmed) return;
    onChange([...photos, trimmed]);
    setPhotoUrl("");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const { url } = await tjUploadImage(file, token);
        uploaded.push(url);
      }
      if (uploaded.length) onChange([...photos, ...uploaded]);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <Field label={label} hint={hint}>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-1 gap-2">
            <Input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrl();
                }
              }}
            />
            <Button variant="outline" type="button" onClick={addUrl} disabled={!photoUrl.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            variant="outline"
            type="button"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="sm:w-auto w-full"
          >
            <Upload className="w-4 h-4" /> Upload from device
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          <span>Link or direct upload · JPG, PNG, WebP · max 5 MB each</span>
        </div>

        {photos.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {photos.map((photo, index) => (
              <div key={`${photo}-${index}`} className="relative group">
                <img
                  src={photo}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover border border-neutral-800"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-1.5 -right-1.5 bg-neutral-900 border border-neutral-700 rounded-full p-0.5 hover:bg-red-900 hover:border-red-800 transition"
                  aria-label="Remove photo"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 px-4 py-6 text-center">
            <ImagePlus className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">No photos added yet</p>
          </div>
        )}
      </div>
    </Field>
  );
}
