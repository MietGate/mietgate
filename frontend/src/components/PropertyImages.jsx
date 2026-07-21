import { useRef, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImagePlus, Star, Trash2, Loader2 } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export function PropertyImages({ property, onChanged }) {
  const [images, setImages] = useState(property.images || []);
  const [titleId, setTitleId] = useState(property.title_image_id || null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const imgUrl = (img) => `${BACKEND}/api/public/properties/${property.id}/images/${img.id}`;

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post(`/properties/${property.id}/images`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setImages(data.images); setTitleId(data.title_image_id);
      toast.success("Bild hochgeladen");
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload fehlgeschlagen");
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const setTitle = async (id) => {
    const { data } = await api.post(`/properties/${property.id}/images/${id}/set-title`);
    setTitleId(data.title_image_id); toast.success("Titelbild gesetzt"); onChanged?.();
  };

  const remove = async (id) => {
    const { data } = await api.delete(`/properties/${property.id}/images/${id}`);
    setImages(data.images); setTitleId(data.title_image_id); toast.success("Bild entfernt"); onChanged?.();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 max-w-3xl" data-testid="property-images">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg">Objektbilder</h2>
          <p className="text-sm text-muted-foreground">Laden Sie ein Titelbild und weitere Fotos hoch. JPG, PNG, WEBP · max. 10 MB.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} data-testid="image-input" />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="upload-image-btn">
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-2" />} Bild hochladen
        </Button>
      </div>
      {images.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-10 text-center">Noch keine Bilder. Fügen Sie das erste Objektbild hinzu.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border aspect-[4/3] bg-secondary" data-testid={`image-${img.id}`}>
              <img src={imgUrl(img)} alt="Objektbild" className="w-full h-full object-cover" />
              {titleId === img.id && (
                <span className="absolute top-2 left-2 text-[11px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex items-center gap-1"><Star className="h-3 w-3 fill-current" /> Titelbild</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {titleId !== img.id && (
                  <Button size="sm" variant="secondary" onClick={() => setTitle(img.id)} data-testid={`set-title-${img.id}`}><Star className="h-3.5 w-3.5 mr-1" /> Titel</Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => remove(img.id)} data-testid={`del-image-${img.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
