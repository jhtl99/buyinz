import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Image, X, ChevronRight, Check } from 'lucide-react';
import { categories } from '@/data/mockListings';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type PostStep = 'photos' | 'details' | 'confirm';

export function PostView({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<PostStep>('photos');
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [acceptOffers, setAcceptOffers] = useState(true);

  const handlePhotoUpload = () => {
    // Simulate photo upload with placeholder
    if (photos.length < 5) {
      setPhotos(prev => [...prev, `https://picsum.photos/400/400?random=${Date.now()}`]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    toast.success('Listing posted!', {
      description: 'Your item is now live.',
    });
    onComplete();
  };

  const canProceedFromPhotos = photos.length > 0;
  const canProceedFromDetails = title && price && category;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <h1 className="text-2xl font-bold text-foreground">
          {step === 'photos' && 'Add Photos'}
          {step === 'details' && 'Item Details'}
          {step === 'confirm' && 'Review'}
        </h1>
        <button 
          onClick={onComplete}
          className="p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Progress */}
      <div className="flex gap-2 px-4 mb-4">
        {(['photos', 'details', 'confirm'] as PostStep[]).map((s, i) => (
          <div 
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= ['photos', 'details', 'confirm'].indexOf(step)
                ? 'bg-primary'
                : 'bg-secondary'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <AnimatePresence mode="wait">
          {step === 'photos' && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-muted-foreground">
                Add up to 5 photos. The first one will be your cover.
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div 
                    key={index}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-card"
                  >
                    <img 
                      src={photo} 
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-background/80 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-foreground" />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 text-[10px] bg-background/80 px-2 py-0.5 rounded-full text-foreground">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
                
                {photos.length < 5 && (
                  <button
                    onClick={handlePhotoUpload}
                    className="aspect-square rounded-2xl bg-secondary flex flex-col items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {photos.length === 0 ? (
                        <Camera className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Image className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {photos.length === 0 ? 'Add photo' : 'Add more'}
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Price */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-foreground">$</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full h-14 pl-10 pr-4 bg-secondary rounded-2xl text-xl font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Title</label>
                <input
                  type="text"
                  placeholder="What are you selling?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-12 px-4 bg-secondary rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c !== 'All').map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        category === cat
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea
                  placeholder="Describe your item..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-secondary rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Accept Offers */}
              <button
                onClick={() => setAcceptOffers(!acceptOffers)}
                className="w-full flex items-center justify-between p-4 bg-secondary rounded-2xl"
              >
                <span className="font-medium text-foreground">Accept offers</span>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
                  acceptOffers ? 'bg-primary' : 'bg-muted'
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${
                    acceptOffers ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </button>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Preview Card */}
              <div className="bg-card rounded-2xl overflow-hidden">
                <div className="aspect-square relative">
                  {photos[0] && (
                    <img 
                      src={photos[0]} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-4 left-4">
                    <span className="glass px-3 py-1.5 rounded-xl text-lg font-bold text-foreground">
                      ${price}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                  <span className="inline-block px-3 py-1 bg-secondary rounded-full text-sm text-muted-foreground">
                    {category}
                  </span>
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-success" />
                {acceptOffers ? 'Accepting offers' : 'Fixed price only'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        {step === 'photos' && (
          <Button
            onClick={() => setStep('details')}
            disabled={!canProceedFromPhotos}
            className="w-full h-14 rounded-2xl text-base font-semibold"
          >
            Continue
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        )}
        {step === 'details' && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep('photos')}
              className="flex-1 h-14 rounded-2xl"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep('confirm')}
              disabled={!canProceedFromDetails}
              className="flex-1 h-14 rounded-2xl text-base font-semibold"
            >
              Review
            </Button>
          </div>
        )}
        {step === 'confirm' && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep('details')}
              className="flex-1 h-14 rounded-2xl"
            >
              Edit
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 h-14 rounded-2xl text-base font-semibold"
            >
              Post Listing
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
