import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ExternalLink } from "lucide-react";

interface VenueMapProps {
  googlePlaceId?: string | null;
  address?: string;
  venueName?: string;
  className?: string;
}

export function VenueMap({ googlePlaceId, address, venueName, className }: VenueMapProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmbedUrl() {
      if (!googlePlaceId && !address) {
        setIsLoading(false);
        setError("No location information available");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (googlePlaceId) {
          params.set("placeId", googlePlaceId);
        } else if (address) {
          params.set("address", address);
        }

        const response = await fetch(`/api/maps/embed?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error("Failed to load map");
        }

        const data = await response.json();
        setEmbedUrl(data.embedUrl);
      } catch (err) {
        console.error("Error fetching map embed URL:", err);
        setError("Unable to load map");
      } finally {
        setIsLoading(false);
      }
    }

    fetchEmbedUrl();
  }, [googlePlaceId, address]);

  const googleMapsUrl = googlePlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`
    : address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  if (!googlePlaceId && !address) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Map
          </span>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-normal text-primary hover:underline flex items-center gap-1"
              data-testid="link-open-google-maps"
            >
              Open in Google Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="w-full h-64 rounded-lg" data-testid="skeleton-map" />
        ) : error ? (
          <div 
            className="w-full h-64 rounded-lg bg-muted flex items-center justify-center text-muted-foreground"
            data-testid="map-error"
          >
            <div className="text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : embedUrl ? (
          <div className="w-full h-64 rounded-lg overflow-hidden">
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map of ${venueName || "venue"}`}
              data-testid="iframe-map"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
