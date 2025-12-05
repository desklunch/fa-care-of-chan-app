import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ImageIcon, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  photoUrl: string;
  authorAttributions: Array<{
    displayName?: string;
    uri?: string;
  }>;
}

interface GooglePlacePhotoPickerProps {
  placeId: string | null;
  placeName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotosSelected: (photos: { galleryPhotos: string[]; primaryPhoto: string | null }) => void;
}

export function GooglePlacePhotoPicker({
  placeId,
  placeName,
  open,
  onOpenChange,
  onPhotosSelected,
}: GooglePlacePhotoPickerProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [primaryPhoto, setPrimaryPhoto] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ photos: PlacePhoto[] }>({
    queryKey: ["/api/places", placeId, "photos"],
    enabled: !!placeId && open,
  });

  const photos = data?.photos || [];

  useEffect(() => {
    if (!open) {
      setSelectedPhotos(new Set());
      setPrimaryPhoto(null);
    }
  }, [open]);

  useEffect(() => {
    if (primaryPhoto && !selectedPhotos.has(primaryPhoto)) {
      setSelectedPhotos(prev => new Set(Array.from(prev).concat(primaryPhoto)));
    }
  }, [primaryPhoto]);

  const togglePhoto = (photoUrl: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoUrl)) {
        newSet.delete(photoUrl);
        if (primaryPhoto === photoUrl) {
          setPrimaryPhoto(null);
        }
      } else {
        newSet.add(photoUrl);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
      setPrimaryPhoto(null);
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.photoUrl)));
    }
  };

  const handleConfirm = () => {
    onPhotosSelected({
      galleryPhotos: Array.from(selectedPhotos),
      primaryPhoto,
    });
    onOpenChange(false);
  };

  const getPhotoUrl = (photoUrl: string, size: number = 400) => {
    return `${photoUrl}?maxWidthPx=${size}&maxHeightPx=${size}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Select Photos from Google Places
          </DialogTitle>
          <DialogDescription>
            {placeName ? (
              <>Choose photos for <strong>{placeName}</strong>. Select photos to add to the gallery and optionally set a primary photo.</>
            ) : (
              "Choose photos to add to the venue gallery. You can also set a primary photo."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading photos...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-destructive">
              Failed to load photos. Please try again.
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-2" />
              <p>No photos available for this place.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {photos.length} photo{photos.length !== 1 ? "s" : ""} available
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  data-testid="button-select-all-photos"
                >
                  {selectedPhotos.size === photos.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((photo, index) => {
                  const isSelected = selectedPhotos.has(photo.photoUrl);
                  const isPrimary = primaryPhoto === photo.photoUrl;

                  return (
                    <div
                      key={photo.name}
                      className={cn(
                        "relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                        isSelected ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                      )}
                      data-testid={`photo-item-${index}`}
                    >
                      <div className="aspect-square relative">
                        <img
                          src={getPhotoUrl(photo.photoUrl, 300)}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        
                        <div
                          className={cn(
                            "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity",
                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                          onClick={() => togglePhoto(photo.photoUrl)}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors",
                            isSelected 
                              ? "bg-primary border-primary text-primary-foreground" 
                              : "border-white bg-white/20"
                          )}>
                            {isSelected && <Check className="h-5 w-5" />}
                          </div>
                        </div>

                        {isPrimary && (
                          <div className="absolute top-2 left-2 bg-yellow-500 text-yellow-950 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Primary
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div className="p-2 bg-muted/50">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrimaryPhoto(isPrimary ? null : photo.photoUrl);
                            }}
                            className={cn(
                              "w-full text-xs py-1 px-2 rounded transition-colors",
                              isPrimary 
                                ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" 
                                : "bg-muted hover:bg-muted-foreground/20"
                            )}
                            data-testid={`button-set-primary-${index}`}
                          >
                            {isPrimary ? "Remove as Primary" : "Set as Primary"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? "s" : ""} selected
              {primaryPhoto && " (1 primary)"}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-photo-picker"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={selectedPhotos.size === 0}
                data-testid="button-confirm-photo-selection"
              >
                Add {selectedPhotos.size} Photo{selectedPhotos.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
