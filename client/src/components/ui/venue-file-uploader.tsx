import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, 
  Loader2, 
  FileImage,
  FileText,
  File,
  FileArchive,
  FileSpreadsheet,
  AlertCircle 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const ALLOWED_PDF_TYPE = "application/pdf";
const ALLOWED_DOCUMENT_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];
const ALLOWED_ARCHIVE_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/gzip",
  "application/x-tar",
];
const ALLOWED_DESIGN_TYPES = [
  "image/vnd.adobe.photoshop",
  "application/x-photoshop",
  "application/photoshop",
];

const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ALLOWED_PDF_TYPE,
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_ARCHIVE_TYPES,
  ...ALLOWED_DESIGN_TYPES,
  "application/octet-stream",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export type FileType = "image" | "pdf" | "document" | "archive" | "other";
export type FileCategory = "floorplan" | "attachment";

interface VenueFileUploadResult {
  fileUrl: string;
  thumbnailUrl?: string;
  fileType: FileType;
  filename: string;
  size: number;
  contentType: string;
}

interface VenueFileUploaderProps {
  venueId: string;
  category: FileCategory;
  onFileUploaded: (result: VenueFileUploadResult, metadata: { title?: string; caption?: string }) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
}

function getFileType(mimeType: string): FileType {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "image";
  if (mimeType === ALLOWED_PDF_TYPE) return "pdf";
  if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) return "document";
  if (ALLOWED_ARCHIVE_TYPES.includes(mimeType)) return "archive";
  return "other";
}

function getFileIcon(fileType: FileType, className = "h-10 w-10") {
  switch (fileType) {
    case "image":
      return <FileImage className={`${className} text-blue-500`} />;
    case "pdf":
      return <FileText className={`${className} text-red-500`} />;
    case "document":
      return <FileSpreadsheet className={`${className} text-green-500`} />;
    case "archive":
      return <FileArchive className={`${className} text-amber-500`} />;
    default:
      return <File className={`${className} text-muted-foreground`} />;
  }
}

export function VenueFileUploader({
  venueId,
  category,
  onFileUploaded,
  onError,
  disabled = false,
  className = "",
  "data-testid": testId = "venue-file-uploader",
}: VenueFileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFloorplan = category === "floorplan";
  const categoryLabel = isFloorplan ? "Floorplan" : "Attachment";

  const handleError = useCallback((message: string) => {
    setError(message);
    onError?.(message);
    setTimeout(() => setError(null), 5000);
  }, [onError]);

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      handleError("File too large. Maximum size is 50MB");
      return false;
    }
    if (isFloorplan && !ALLOWED_IMAGE_TYPES.includes(file.type) && file.type !== ALLOWED_PDF_TYPE) {
      handleError("Invalid file type. Floorplans must be images (JPG, PNG, WebP) or PDF");
      return false;
    }
    return true;
  }, [handleError, isFloorplan]);

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

      const response = await apiRequest("POST", "/api/venue-files/upload", {
        venueId,
        category,
        fileData: base64Data,
        filename: file.name,
        mimeType: file.type,
        title: metadata.title,
        caption: metadata.caption,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const result = await response.json();
      setUploadProgress(null);
      
      const fileType = getFileType(file.type);
      onFileUploaded({
        fileUrl: result.fileUrl,
        thumbnailUrl: result.thumbnailUrl,
        fileType,
        filename: file.name,
        size: file.size,
        contentType: file.type,
      }, metadata);

      setTitle("");
      setCaption("");
      setPendingFile(null);
    } catch (err) {
      handleError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [validateFile, venueId, category, onFileUploaded, handleError]);

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

  const pendingFileType = pendingFile ? getFileType(pendingFile.type) : null;
  const pendingFileExt = pendingFile ? getFileExtension(pendingFile.name) : "";

  const acceptTypes = isFloorplan 
    ? [...ALLOWED_IMAGE_TYPES, ALLOWED_PDF_TYPE].join(",")
    : ALL_ALLOWED_TYPES.join(",");

  return (
    <div className={`space-y-3 ${className}`} data-testid={testId}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
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
                {isFloorplan ? (
                  <>
                    <FileImage className="h-6 w-6 text-muted-foreground" />
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </>
                ) : (
                  <>
                    <File className="h-6 w-6 text-muted-foreground" />
                    <FileArchive className="h-6 w-6 text-muted-foreground" />
                  </>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Drop a {categoryLabel.toLowerCase()} here or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  {isFloorplan 
                    ? "Images (JPG, PNG, WebP) or PDF up to 50MB"
                    : "Any file type up to 50MB (PDF, Word, Excel, ZIP, etc.)"
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-4 space-y-4" data-testid={`${testId}-pending-upload`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              {pendingFileType && getFileIcon(pendingFileType)}
              {pendingFileExt && (
                <span className="absolute -bottom-1 -right-1 bg-background border text-[10px] font-medium px-1 rounded">
                  {pendingFileExt}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pendingFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {pendingFileType === "image" ? "Image" : 
                 pendingFileType === "pdf" ? "PDF Document" :
                 pendingFileType === "document" ? "Document" :
                 pendingFileType === "archive" ? "Archive" : "File"} • {(pendingFile.size / 1024).toFixed(1)} KB
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
                placeholder={isFloorplan ? "e.g., Main Floor Layout" : "e.g., Event Contract 2024"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
                data-testid={`${testId}-title-input`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${testId}-caption`} className="text-sm">
                Description (optional)
              </Label>
              <Textarea
                id={`${testId}-caption`}
                placeholder={isFloorplan 
                  ? "Add any notes about this floorplan..." 
                  : "Add any notes about this file..."
                }
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
                  Upload {categoryLabel}
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
