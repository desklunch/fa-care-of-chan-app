import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";

export function registerPlacesRoutes(app: Express): void {
  // Google Places Autocomplete - cities only
  app.get("/api/places/autocomplete", isAuthenticated, async (req, res) => {
    try {
      const { input } = req.query;
      if (!input || typeof input !== "string") {
        return res.status(400).json({ message: "Input is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching places autocomplete:", error);
      res.status(500).json({ message: "Failed to fetch place suggestions" });
    }
  });

  // Google Places Address Autocomplete
  app.get("/api/places/address-autocomplete", isAuthenticated, async (req, res) => {
    try {
      const { input } = req.query;
      if (!input || typeof input !== "string") {
        return res.status(400).json({ message: "Input is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching address autocomplete:", error);
      res.status(500).json({ message: "Failed to fetch address suggestions" });
    }
  });

  // Google Places Address Details
  app.get("/api/places/address-details", isAuthenticated, async (req, res) => {
    try {
      const { place_id } = req.query;
      if (!place_id || typeof place_id !== "string") {
        return res.status(400).json({ message: "Place ID is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=formatted_address,name,address_components&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();
      const result = data.result;
      
      res.json({
        formattedAddress: result?.formatted_address || "",
        name: result?.name || "",
        addressComponents: result?.address_components || [],
      });
    } catch (error) {
      console.error("Error fetching address details:", error);
      res.status(500).json({ message: "Failed to fetch address details" });
    }
  });

  // Google Places Details - Parse location info
  app.get("/api/places/details", isAuthenticated, async (req, res) => {
    try {
      const { place_id } = req.query;
      if (!place_id || typeof place_id !== "string") {
        return res.status(400).json({ message: "Place ID is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=address_components,formatted_address&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();
      const result = data.result;
      let city = "";
      let region = "";
      let regionCode = "";
      let country = "";
      let countryCode = "";

      if (result?.address_components) {
        for (const component of result.address_components) {
          if (component.types.includes("locality")) {
            city = component.long_name;
          } else if (component.types.includes("administrative_area_level_1")) {
            region = component.long_name;
            regionCode = component.short_name;
          } else if (component.types.includes("country")) {
            country = component.long_name;
            countryCode = component.short_name;
          }
        }
      }

      res.json({ city, region, regionCode, country, countryCode });
    } catch (error) {
      console.error("Error fetching place details:", error);
      res.status(500).json({ message: "Failed to fetch place details" });
    }
  });

  // Google Places Text Search API (New Places API v1)
  app.post("/api/places/text-search", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const fieldMask = [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.addressComponents",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.location",
        "places.types",
        "places.businessStatus",
        "places.priceLevel",
        "places.rating",
        "places.userRatingCount",
        "places.regularOpeningHours",
        "places.currentOpeningHours",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.editorialSummary",
        "places.reviews",
        "places.photos",
        "places.paymentOptions",
        "places.parkingOptions",
        "places.accessibilityOptions",
        "places.dineIn",
        "places.takeout",
        "places.delivery",
        "places.curbsidePickup",
        "places.reservable",
        "places.servesBreakfast",
        "places.servesLunch",
        "places.servesDinner",
        "places.servesBeer",
        "places.servesWine",
        "places.servesBrunch",
        "places.servesVegetarianFood",
        "places.outdoorSeating",
        "places.liveMusic",
        "places.menuForChildren",
        "places.servesCocktails",
        "places.servesDessert",
        "places.servesCoffee",
        "places.goodForChildren",
        "places.allowsDogs",
        "places.restroom",
        "places.goodForGroups",
        "places.goodForWatchingSports",
        "places.utcOffsetMinutes",
        "places.adrFormatAddress",
        "places.iconMaskBaseUri",
        "places.iconBackgroundColor",
        "places.shortFormattedAddress",
      ].join(",");

      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify({
            textQuery: query,
            languageCode: "en",
            pageSize: 10,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Google Places API error:", errorData);
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();
      
      const places = (data.places || []).map((place: any) => {
        let streetNumber = "";
        let route = "";
        let city = "";
        let state = "";
        let stateCode = "";
        let zipCode = "";
        let country = "";
        let countryCode = "";

        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            const types = component.types || [];
            if (types.includes("street_number")) {
              streetNumber = component.longText || "";
            } else if (types.includes("route")) {
              route = component.longText || "";
            } else if (types.includes("locality")) {
              city = component.longText || "";
            } else if (types.includes("sublocality_level_1") && !city) {
              city = component.longText || "";
            } else if (types.includes("administrative_area_level_1")) {
              state = component.longText || "";
              stateCode = component.shortText || "";
            } else if (types.includes("postal_code")) {
              zipCode = component.longText || "";
            } else if (types.includes("country")) {
              country = component.longText || "";
              countryCode = component.shortText || "";
            }
          }
        }

        const streetAddress1 = [streetNumber, route].filter(Boolean).join(" ");

        return {
          placeId: place.id || "",
          name: place.displayName?.text || "",
          formattedAddress: place.formattedAddress || "",
          streetAddress1,
          city,
          state,
          stateCode,
          zipCode,
          country,
          countryCode,
          phone: place.nationalPhoneNumber || place.internationalPhoneNumber || "",
          website: place.websiteUri || "",
          googleMapsUrl: place.googleMapsUri || "",
          location: place.location || null,
          editorialSummary: place.editorialSummary?.text || "",
          rawPlaceDetails: place,
        };
      });

      res.json({ places });
    } catch (error) {
      console.error("Error in text search:", error);
      res.status(500).json({ message: "Failed to search places" });
    }
  });

  // Google Places City Search
  app.post("/api/places/city-search", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const fieldMask = [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.addressComponents",
      ].join(",");

      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify({
            textQuery: `${query} city`,
            includedType: "locality",
            maxResultCount: 10,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Google Places API error:", errorData);
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();

      const cities = (data.places || []).map((place: any) => {
        let city = "";
        let state = "";
        let stateCode = "";
        let country = "";
        let countryCode = "";

        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            const types = component.types || [];
            if (types.includes("locality")) {
              city = component.longText || "";
            } else if (types.includes("sublocality_level_1") && !city) {
              city = component.longText || "";
            } else if (types.includes("administrative_area_level_1")) {
              state = component.longText || "";
              stateCode = component.shortText || "";
            } else if (types.includes("country")) {
              country = component.longText || "";
              countryCode = component.shortText || "";
            }
          }
        }

        if (!city && place.displayName?.text) {
          city = place.displayName.text;
        }

        let displayName = city;
        if (countryCode === "US" && stateCode) {
          displayName = `${city}, ${stateCode}`;
        } else if (country) {
          displayName = `${city}, ${country}`;
        }

        return {
          placeId: place.id || "",
          city,
          state,
          stateCode,
          country,
          countryCode,
          displayName,
          formattedAddress: place.formattedAddress || "",
        };
      }).filter((c: any) => c.city);

      res.json({ cities });
    } catch (error) {
      console.error("Error in city search:", error);
      res.status(500).json({ message: "Failed to search cities" });
    }
  });

  // Google Places Location Search - Search for cities OR countries
  app.post("/api/places/location-search", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const fieldMask = [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.addressComponents",
        "places.types",
      ].join(",");

      const [cityResponse, countryResponse, stateResponse] = await Promise.all([
        fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify({
            textQuery: `${query} city`,
            includedType: "locality",
            maxResultCount: 5,
          }),
        }),
        fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify({
            textQuery: query,
            includedType: "country",
            maxResultCount: 3,
          }),
        }),
        fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify({
            textQuery: `${query} state USA`,
            includedType: "administrative_area_level_1",
            maxResultCount: 3,
          }),
        }),
      ]);

      const cityData = cityResponse.ok ? await cityResponse.json() : { places: [] };
      const countryData = countryResponse.ok ? await countryResponse.json() : { places: [] };
      const stateData = stateResponse.ok ? await stateResponse.json() : { places: [] };

      const parseLocation = (place: any, locationType: "city" | "country" | "state") => {
        let city = "";
        let state = "";
        let stateCode = "";
        let country = "";
        let countryCode = "";

        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            const types = component.types || [];
            if (types.includes("locality")) {
              city = component.longText || "";
            } else if (types.includes("sublocality_level_1") && !city) {
              city = component.longText || "";
            } else if (types.includes("administrative_area_level_1")) {
              state = component.longText || "";
              stateCode = component.shortText || "";
            } else if (types.includes("country")) {
              country = component.longText || "";
              countryCode = component.shortText || "";
            }
          }
        }

        if (locationType === "country" && !country && place.displayName?.text) {
          country = place.displayName.text;
          if (place.addressComponents?.length === 1) {
            countryCode = place.addressComponents[0].shortText || "";
          }
        }

        if (locationType === "state" && !state && place.displayName?.text) {
          state = place.displayName.text;
          stateCode = place.addressComponents?.[0]?.shortText || "";
        }

        if (locationType === "city" && !city && place.displayName?.text) {
          city = place.displayName.text;
        }

        let displayName: string;
        if (locationType === "country") {
          displayName = country;
        } else if (locationType === "state") {
          displayName = `${state}, USA`;
        } else if (countryCode === "US" && stateCode) {
          displayName = `${city}, ${stateCode}`;
        } else if (country) {
          displayName = `${city}, ${country}`;
        } else {
          displayName = city;
        }

        return {
          placeId: place.id || "",
          city: locationType === "city" ? city : undefined,
          state: locationType === "city" ? state : (locationType === "state" ? state : undefined),
          stateCode: locationType === "city" ? stateCode : (locationType === "state" ? stateCode : undefined),
          country,
          countryCode,
          displayName,
          formattedAddress: place.formattedAddress || "",
          type: locationType,
        };
      };

      const cities = (cityData.places || [])
        .map((p: any) => parseLocation(p, "city"))
        .filter((c: any) => c.city);

      const countries = (countryData.places || [])
        .map((p: any) => parseLocation(p, "country"))
        .filter((c: any) => c.country);

      const states = (stateData.places || [])
        .map((p: any) => parseLocation(p, "state"))
        .filter((s: any) => s.state && s.countryCode === "US");

      const locations = [...cities, ...states, ...countries];

      res.json({ locations });
    } catch (error) {
      console.error("Error in location search:", error);
      res.status(500).json({ message: "Failed to search locations" });
    }
  });

  // Google Places Refresh - Re-fetch full place details by placeId
  app.post("/api/places/refresh", isAuthenticated, async (req, res) => {
    try {
      const { placeId } = req.body;
      if (!placeId || typeof placeId !== "string") {
        return res.status(400).json({ message: "Place ID is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const fieldMask = [
        "id",
        "displayName",
        "formattedAddress",
        "addressComponents",
        "nationalPhoneNumber",
        "internationalPhoneNumber",
        "websiteUri",
        "googleMapsUri",
        "location",
        "types",
        "businessStatus",
        "priceLevel",
        "rating",
        "userRatingCount",
        "regularOpeningHours",
        "primaryType",
        "primaryTypeDisplayName",
        "editorialSummary",
        "photos",
      ].join(",");

      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Google Places API error:", errorData);
        throw new Error("Failed to fetch from Google Places API");
      }

      const place = await response.json();
      
      let streetNumber = "";
      let route = "";
      let city = "";
      let state = "";
      let stateCode = "";
      let zipCode = "";
      let country = "";
      let countryCode = "";

      if (place.addressComponents) {
        for (const component of place.addressComponents) {
          const types = component.types || [];
          if (types.includes("street_number")) {
            streetNumber = component.longText || "";
          } else if (types.includes("route")) {
            route = component.longText || "";
          } else if (types.includes("locality")) {
            city = component.longText || "";
          } else if (types.includes("sublocality_level_1") && !city) {
            city = component.longText || "";
          } else if (types.includes("administrative_area_level_1")) {
            state = component.longText || "";
            stateCode = component.shortText || "";
          } else if (types.includes("postal_code")) {
            zipCode = component.longText || "";
          } else if (types.includes("country")) {
            country = component.longText || "";
            countryCode = component.shortText || "";
          }
        }
      }

      const streetAddress1 = [streetNumber, route].filter(Boolean).join(" ");

      const result = {
        placeId: place.id || placeId,
        name: place.displayName?.text || "",
        formattedAddress: place.formattedAddress || "",
        streetAddress1,
        city,
        state,
        stateCode,
        zipCode,
        country,
        countryCode,
        phone: place.nationalPhoneNumber || place.internationalPhoneNumber || "",
        website: place.websiteUri || "",
        googleMapsUrl: place.googleMapsUri || "",
        location: place.location || null,
        editorialSummary: place.editorialSummary?.text || "",
        rawPlaceDetails: place,
      };

      res.json(result);
    } catch (error) {
      console.error("Error refreshing place details:", error);
      res.status(500).json({ message: "Failed to refresh place details" });
    }
  });

  // Google Places Photos API - Fetch photos for a place
  app.get("/api/places/:placeId/photos", isAuthenticated, async (req, res) => {
    try {
      const { placeId } = req.params;
      if (!placeId) {
        return res.status(400).json({ message: "Place ID is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "photos",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Google Places API error:", errorData);
        throw new Error("Failed to fetch place photos");
      }

      const data = await response.json();
      
      const photos = (data.photos || []).map((photo: any) => ({
        name: photo.name,
        widthPx: photo.widthPx,
        heightPx: photo.heightPx,
        authorAttributions: photo.authorAttributions || [],
        photoUrl: `/api/places/photos/${encodeURIComponent(photo.name)}`,
      }));

      res.json({ photos });
    } catch (error) {
      console.error("Error fetching place photos:", error);
      res.status(500).json({ message: "Failed to fetch place photos" });
    }
  });

  // Google Places Photo Proxy - Fetch the actual photo binary (public)
  app.get("/api/places/photos/:photoName(*)", async (req, res) => {
    try {
      const { photoName } = req.params;
      if (!photoName) {
        return res.status(400).json({ message: "Photo name is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const maxWidthPx = parseInt(req.query.maxWidthPx as string) || 800;
      const maxHeightPx = parseInt(req.query.maxHeightPx as string) || 600;

      const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}&key=${apiKey}`;
      
      const response = await fetch(photoUrl, {
        redirect: 'follow',
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Google Places Photo API error:", errorData);
        throw new Error("Failed to fetch photo");
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=604800");

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error("Error proxying photo:", error);
      res.status(500).json({ message: "Failed to fetch photo" });
    }
  });

  // Google Maps Static API - Serve static map image
  app.get("/api/maps/static", async (req, res) => {
    try {
      const { placeId, address, width, height, theme } = req.query;
      
      if (!placeId && !address) {
        return res.status(400).json({ message: "Either placeId or address is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Maps API key not configured" });
      }

      const mapWidth = parseInt(width as string) || 600;
      const mapHeight = parseInt(height as string) || 300;
      const mapTheme = (theme as string) || "light";
      
      let location: string;
      if (placeId) {
        location = `place_id:${placeId}`;
      } else {
        location = address as string;
      }

      const darkModeStyles = [
        "style=element:geometry|color:0x212121",
        "style=element:labels.icon|visibility:off",
        "style=element:labels.text.fill|color:0x757575",
        "style=element:labels.text.stroke|color:0x212121",
        "style=feature:administrative|element:geometry|color:0x757575",
        "style=feature:administrative.country|element:labels.text.fill|color:0x9e9e9e",
        "style=feature:administrative.land_parcel|visibility:off",
        "style=feature:administrative.locality|element:labels.text.fill|color:0xbdbdbd",
        "style=feature:poi|element:labels.text.fill|color:0x757575",
        "style=feature:poi.park|element:geometry|color:0x181818",
        "style=feature:poi.park|element:labels.text.fill|color:0x616161",
        "style=feature:road|element:geometry.fill|color:0x2c2c2c",
        "style=feature:road|element:labels.text.fill|color:0x8a8a8a",
        "style=feature:road.arterial|element:geometry|color:0x373737",
        "style=feature:road.highway|element:geometry|color:0x3c3c3c",
        "style=feature:road.highway.controlled_access|element:geometry|color:0x4e4e4e",
        "style=feature:road.local|element:labels.text.fill|color:0x616161",
        "style=feature:transit|element:labels.text.fill|color:0x757575",
        "style=feature:water|element:geometry|color:0x000000",
        "style=feature:water|element:labels.text.fill|color:0x3d3d3d",
      ];

      let staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
        `center=${encodeURIComponent(location)}` +
        `&zoom=15` +
        `&size=${mapWidth}x${mapHeight}` +
        `&scale=2` +
        `&maptype=roadmap` +
        `&markers=color:red%7C${encodeURIComponent(location)}` +
        `&key=${apiKey}`;
      
      if (mapTheme === "dark") {
        staticMapUrl += "&" + darkModeStyles.join("&");
      }

      const response = await fetch(staticMapUrl);
      
      if (!response.ok) {
        throw new Error("Failed to fetch static map");
      }

      const contentType = response.headers.get("content-type") || "image/png";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error("Error generating static map:", error);
      res.status(500).json({ message: "Failed to generate static map" });
    }
  });
}
