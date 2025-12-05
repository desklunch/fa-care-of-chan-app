import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, 
  Link as LinkIcon, 
  Loader2, 
  FileImage,
  FileText,
  AlertCircle 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const ALLOWED_PDF_TYPE = "application/pdf";
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ALLOWED_PDF_TYPE];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface FloorplanUploadResult {
  fileUrl: string;
  thumbnailUrl?: string;
  fileType: "image" | "pdf";
  filename?: string;
  size: number;
  contentType: string;
}

interface FloorplanUploaderProps {
  venueId: string;
  onFloorplanUploaded: (result: FloorplanUploadResult, metadata: { title?: string; caption?: string }) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function FloorplanUploader({
  venueId,
  onFloorplanUploaded,
  onError,
  disabled = false,
  className = "",
  "data-testid": testId = "floorplan-uploader",
}: FloorplanUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleError = useCallback((message: string) => {
    setError(message);
    onError?.(message);
    setTimeout(() => setError(null), 5000);
  }, [onError]);

  const validateFile = useCallback((file: File): boolean => {
    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
      handleError("Invalid file type. Allowed: JPG, PNG, WebP, GIF, AVIF, or PDF");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      handleError("File too large. Maximum size is 10MB");
      return false;
    }
    return true;
  }, [handleError]);

  const uploadFile = useCallback(async (file: File, metadata: { title?: string; caption?: string }) => {
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

      const isPdf = file.type === ALLOWED_PDF_TYPE;
      const fileType: "image" | "pdf" = isPdf ? "pdf" : "image";

      // Use the photos/upload endpoint for images (it generates thumbnails)
      // For PDFs, we'll upload directly without thumbnail generation
      if (isPdf) {
        const response = await apiRequest("POST", "/api/floorplans/upload", {
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
        onFloorplanUploaded({
          fileUrl: result.fileUrl,
          thumbnailUrl: undefined,
          fileType: "pdf",
          filename: file.name,
          size: file.size,
          contentType: file.type,
        }, metadata);
      } else {
        // Use existing photo upload endpoint for images (gets thumbnail)
        const response = await apiRequest("POST", "/api/photos/upload", {
          data: base64Data,
          filename: file.name,
          contentType: file.type,
          venueId,
          subfolder: "floorplans",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Upload failed");
        }

        const result = await response.json();
        setUploadProgress(null);
        onFloorplanUploaded({
          fileUrl: result.photoUrl,
          thumbnailUrl: result.thumbnailUrl,
          fileType: "image",
          filename: file.name,
          size: file.size,
          contentType: file.type,
        }, metadata);
      }

      // Clear the form after successful upload
      setTitle("");
      setCaption("");
      setPendingFile(null);
    } catch (err) {
      handleError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [validateFile, venueId, onFloorplanUploaded, handleError]);

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
      setPendingFile(files[0]);
    }
  }, [disabled, isUploading]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setPendingFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSubmit = useCallback(() => {
    if (pendingFile) {
      uploadFile(pendingFile, { title: title.trim() || undefined, caption: caption.trim() || undefined });
    }
  }, [pendingFile, title, caption, uploadFile]);

  const handleCancelPending = useCallback(() => {
    setPendingFile(null);
    setTitle("");
    setCaption("");
  }, []);

  const isPdf = pendingFile?.type === ALLOWED_PDF_TYPE;

  return (
    <div className={`space-y-3 ${className}`} data-testid={testId}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALL_ALLOWED_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
        data-testid={`${testId}-file-input`}
      />

      {!pendingFile ? (
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
              <div className="flex gap-2">
                <FileImage className="h-6 w-6 text-muted-foreground" />
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Drop a floorplan here or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  Images (JPG, PNG, WebP) or PDF up to 10MB
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-4 space-y-4" data-testid={`${testId}-pending-upload`}>
          <div className="flex items-center gap-3">
            {isPdf ? (
              <FileText className="h-10 w-10 text-red-500" />
            ) : (
              <FileImage className="h-10 w-10 text-blue-500" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pendingFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {isPdf ? "PDF Document" : "Image"} • {(pendingFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${testId}-title`} className="text-sm">
                Title (optional)
              </Label>
              <Input
                id={`${testId}-title`}
                placeholder="e.g., Main Floor Layout"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
                data-testid={`${testId}-title-input`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${testId}-caption`} className="text-sm">
                Caption (optional)
              </Label>
              <Textarea
                id={`${testId}-caption`}
                placeholder="Add any notes about this floorplan..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={isUploading}
                rows={2}
                className="resize-none"
                data-testid={`${testId}-caption-input`}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelPending}
              disabled={isUploading}
              data-testid={`${testId}-cancel-btn`}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isUploading}
              data-testid={`${testId}-upload-btn`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Floorplan
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive" data-testid={`${testId}-error`}>
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
