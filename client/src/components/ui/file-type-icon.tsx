import { 
  FileImage,
  FileText,
  File,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  FileVideo,
  FileAudio,
} from "lucide-react";

export type FileType = "image" | "pdf" | "document" | "archive" | "other";

interface FileTypeIconProps {
  filename: string;
  mimeType?: string;
  fileType?: FileType;
  size?: "sm" | "md" | "lg";
  showExtension?: boolean;
  className?: string;
  "data-testid"?: string;
}

const MIME_TYPE_MAP: Record<string, FileType> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/avif": "image",
  "image/svg+xml": "image",
  "image/bmp": "image",
  "image/tiff": "image",
  "application/pdf": "pdf",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.ms-excel": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
  "application/vnd.ms-powerpoint": "document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "document",
  "text/plain": "document",
  "text/csv": "document",
  "application/zip": "archive",
  "application/x-zip-compressed": "archive",
  "application/x-rar-compressed": "archive",
  "application/x-7z-compressed": "archive",
  "application/gzip": "archive",
  "application/x-tar": "archive",
  "image/vnd.adobe.photoshop": "other",
  "application/x-photoshop": "other",
  "application/photoshop": "other",
};

const EXTENSION_MAP: Record<string, FileType> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  avif: "image",
  svg: "image",
  bmp: "image",
  tiff: "image",
  ico: "image",
  pdf: "pdf",
  doc: "document",
  docx: "document",
  xls: "document",
  xlsx: "document",
  ppt: "document",
  pptx: "document",
  txt: "document",
  csv: "document",
  rtf: "document",
  odt: "document",
  ods: "document",
  odp: "document",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
  bz2: "archive",
  psd: "other",
  ai: "other",
  eps: "other",
  sketch: "other",
  fig: "other",
  xd: "other",
};

const ICON_COLORS: Record<FileType, string> = {
  image: "text-blue-500",
  pdf: "text-red-500",
  document: "text-green-500",
  archive: "text-amber-500",
  other: "text-muted-foreground",
};

const SIZE_CLASSES = {
  sm: { icon: "h-5 w-5", badge: "text-[8px] px-0.5", badgeOffset: "-bottom-0.5 -right-0.5" },
  md: { icon: "h-8 w-8", badge: "text-[9px] px-1", badgeOffset: "-bottom-1 -right-1" },
  lg: { icon: "h-12 w-12", badge: "text-[10px] px-1", badgeOffset: "-bottom-1.5 -right-1.5" },
};

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function determineFileType(filename: string, mimeType?: string, providedType?: FileType): FileType {
  if (providedType) return providedType;
  
  if (mimeType && MIME_TYPE_MAP[mimeType]) {
    return MIME_TYPE_MAP[mimeType];
  }
  
  const ext = getExtension(filename);
  if (ext && EXTENSION_MAP[ext]) {
    return EXTENSION_MAP[ext];
  }
  
  return "other";
}

function getIcon(fileType: FileType, iconClass: string) {
  const colorClass = ICON_COLORS[fileType];
  const className = `${iconClass} ${colorClass}`;
  
  switch (fileType) {
    case "image":
      return <FileImage className={className} />;
    case "pdf":
      return <FileText className={className} />;
    case "document":
      return <FileSpreadsheet className={className} />;
    case "archive":
      return <FileArchive className={className} />;
    default:
      return <File className={className} />;
  }
}

export function FileTypeIcon({
  filename,
  mimeType,
  fileType: providedFileType,
  size = "md",
  showExtension = true,
  className = "",
  "data-testid": testId = "file-type-icon",
}: FileTypeIconProps) {
  const fileType = determineFileType(filename, mimeType, providedFileType);
  const extension = getExtension(filename).toUpperCase();
  const sizeConfig = SIZE_CLASSES[size];
  
  return (
    <div className={`relative inline-flex ${className}`} data-testid={testId}>
      {getIcon(fileType, sizeConfig.icon)}
      {showExtension && extension && (
        <span 
          className={`absolute ${sizeConfig.badgeOffset} bg-background border rounded font-semibold ${sizeConfig.badge}`}
          data-testid={`${testId}-extension`}
        >
          {extension}
        </span>
      )}
    </div>
  );
}

export function getFileTypeFromMime(mimeType: string): FileType {
  return MIME_TYPE_MAP[mimeType] || "other";
}

export function getFileTypeFromFilename(filename: string): FileType {
  const ext = getExtension(filename);
  return EXTENSION_MAP[ext] || "other";
}
