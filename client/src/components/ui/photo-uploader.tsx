import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  Link as LinkIcon, 
  Loader2, 
  X, 
  ImagePlus,
  AlertCircle 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface PhotoUploadResult {
  photoUrl: string;
  thumbnailUrl: string;
  filename?: string;
  originalUrl?: string;
  size: number;
  contentType: string;
}

interface PhotoUploaderProps {
  venueId?: number;
  onPhotoUploaded: (result: PhotoUploadResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function PhotoUploader({
  venueId,
  onPhotoUploaded,
  onError,
  disabled = false,
  className = "",
  "data-testid": testId = "photo-uploader",
}: PhotoUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleError = useCallback((message: string) => {
    setError(message);
    onError?.(message);
    setTimeout(() => setError(null), 5000);
  }, [onError]);

  const validateFile = useCallback((file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      handleError("Invalid file type. Allowed: JPG, PNG, WebP, GIF");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      handleError("File too large. Maximum size is 10MB");
      return false;
    }
    return true;
  }, [handleError]);

  const uploadFile = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setUploadProgress("Reading file...");
    setError(null);

    try {
      const reader = new FileReader();
      
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      setUploadProgress("Uploading...");

      const response = await apiRequest("POST", "/api/photos/upload", {
        data: base64Data,
        filename: file.name,
        contentType: file.type,
        venueId,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const result = await response.json();
      setUploadProgress(null);
      onPhotoUploaded(result);
    } catch (err) {
      handleError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [validateFile, venueId, onPhotoUploaded, handleError]);

  const uploadFromUrl = useCallback(async () => {
    if (!urlInput.trim()) {
      handleError("Please enter a URL");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Fetching image...");
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/photos/from-url", {
        url: urlInput.trim(),
        venueId,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to import from URL");
      }

      const result = await response.json();
      setUrlInput("");
      setShowUrlInput(false);
      onPhotoUploaded(result);
    } catch (err) {
      handleError(err instanceof Error ? err.message : "Failed to import from URL");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [urlInput, venueId, onPhotoUploaded, handleError]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, [disabled, isUploading, uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploadFile]);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={`space-y-3 ${className}`} data-testid={testId}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
        data-testid={`${testId}-file-input`}
      />

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClickUpload}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragOver 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }
          ${disabled || isUploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
        data-testid={`${testId}-drop-zone`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{uploadProgress}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Drop an image here or click to upload
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP, GIF up to 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive" data-testid={`${testId}-error`}>
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUrlInput(!showUrlInput)}
          disabled={disabled || isUploading}
          data-testid={`${testId}-url-toggle`}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Import from URL
        </Button>
      </div>

      {showUrlInput && (
        <div className="flex gap-2" data-testid={`${testId}-url-section`}>
          <div className="flex-1">
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={disabled || isUploading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  uploadFromUrl();
                }
              }}
              data-testid={`${testId}-url-input`}
            />
          </div>
          <Button
            type="button"
            onClick={uploadFromUrl}
            disabled={disabled || isUploading || !urlInput.trim()}
            data-testid={`${testId}-url-submit`}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowUrlInput(false);
              setUrlInput("");
            }}
            disabled={isUploading}
            data-testid={`${testId}-url-cancel`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
