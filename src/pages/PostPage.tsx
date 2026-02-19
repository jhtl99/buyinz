import { useState, useRef } from "react";
import { Camera, X, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Condition = "New" | "Like New" | "Good" | "Fair";
type Category = "Furniture" | "Clothing" | "Electronics" | "Books" | "Decor" | "Other";

const CONDITIONS: Condition[] = ["New", "Like New", "Good", "Fair"];
const CATEGORIES: Category[] = ["Furniture", "Clothing", "Electronics", "Books", "Decor", "Other"];

export function PostPage() {
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<Condition | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 6));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const canSubmit = photos.length > 0 && title.trim() && price && condition && category;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setTitle("");
    setPrice("");
    setCondition(null);
    setCategory(null);
    setDescription("");
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="w-16 h-16 rounded-full brand-gradient flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">Listed!</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your item is now visible to buyers nearby.
        </p>
        <button
          onClick={handleReset}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Post another item
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-foreground">New Listing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Add photos and details to sell your item.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-5">
        {/* Photos */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-2 block">
            Photos ({photos.length}/6)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {photos.length === 0 ? (
                  <Camera className="w-6 h-6" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                <span className="text-[10px] font-medium">
                  {photos.length === 0 ? "Add Photos" : "Add"}
                </span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you selling?"
            className="text-sm"
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">$</span>
            <Input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="pl-7 text-sm font-semibold"
            />
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-2 block">Condition</label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  condition === c
                    ? "brand-gradient text-white border-transparent"
                    : "bg-secondary text-foreground border-border hover:border-primary/50",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-2 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  category === cat
                    ? "brand-gradient text-white border-transparent"
                    : "bg-secondary text-foreground border-border hover:border-primary/50",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your item — condition details, dimensions, brand, etc."
            rows={4}
            className="text-sm resize-none"
          />
        </div>
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:ml-56 px-4 py-3 bg-background/90 backdrop-blur border-t border-border">
        <div className="max-w-[500px] mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "w-full flex items-center justify-center gap-1.5 text-sm h-11 rounded-full font-semibold transition-opacity",
              canSubmit ? "brand-gradient text-white opacity-100" : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed",
            )}
          >
            Post Listing
          </button>
        </div>
      </div>
    </div>
  );
}
