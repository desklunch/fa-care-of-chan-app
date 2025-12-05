import { useState } from "react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!googlePlaceId && !address) {
    return null;
  }

  const params = new URLSearchParams();
  if (googlePlaceId) {
    params.set("placeId", googlePlaceId);
  } else if (address) {
    params.set("address", address);
  }
  params.set("width", "800");
  params.set("height", "300");

  const staticMapUrl = `/api/maps/static?${params.toString()}`;

  const googleMapsUrl = googlePlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`
    : address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

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
        <div className="relative w-full h-64 rounded-lg overflow-hidden bg-muted">
          {isLoading && (
            <Skeleton className="absolute inset-0" data-testid="skeleton-map" />
          )}
          {error ? (
            <div 
              className="absolute inset-0 flex items-center justify-center text-muted-foreground"
              data-testid="map-error"
            >
              <div className="text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Unable to load map</p>
              </div>
            </div>
          ) : (
            <img
              src={staticMapUrl}
              alt={`Map of ${venueName || "venue location"}`}
              className="w-full h-full object-cover"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError(true);
              }}
              data-testid="img-static-map"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
