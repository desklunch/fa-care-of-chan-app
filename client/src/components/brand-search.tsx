import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Brand } from "@shared/schema";
import { X, Search, Plus, Tag, Loader2 } from "lucide-react";

interface BrandSearchProps {
  selectedBrandId?: string | null;
  selectedBrandName?: string | null;
  onSelect: (brand: { id: string; name: string } | null) => void;
  disabled?: boolean;
}

export function BrandSearch({
  selectedBrandId,
  selectedBrandName,
  onSelect,
  disabled = false,
}: BrandSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const createBrandMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/brands", { name });
      return res.json() as Promise<Brand>;
    },
    onSuccess: (newBrand) => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      onSelect({ id: newBrand.id, name: newBrand.name });
      setShowCreateForm(false);
      setNewBrandName("");
      setShowDropdown(false);
      toast({
        title: "Brand created",
        description: `${newBrand.name} has been added.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create brand",
        variant: "destructive",
      });
    },
  });

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowCreateForm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    onSelect(null);
    setSearchQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectBrand = (brand: Brand) => {
    onSelect({ id: brand.id, name: brand.name });
    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleCreateBrand = () => {
    if (newBrandName.trim()) {
      createBrandMutation.mutate(newBrandName.trim());
    }
  };

  if (selectedBrandId && selectedBrandName) {
    return (
      <div className="flex items-center gap-2" ref={containerRef}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 border border-input rounded-md flex-1">
          <span data-testid="text-selected-brand" className="text-sm">{selectedBrandName}</span>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              data-testid="button-clear-brand"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search for a brand..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          disabled={disabled}
          className="pl-9"
          data-testid="input-brand-search"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <>
              {filteredBrands.length > 0 ? (
                <ul className="py-1">
                  {filteredBrands.map((brand) => (
                    <li key={brand.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover-elevate flex items-center gap-2"
                        onClick={() => handleSelectBrand(brand)}
                        data-testid={`option-brand-${brand.id}`}
                      >
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span>{brand.name}</span>
                        {brand.industry && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {brand.industry}
                          </Badge>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : searchQuery ? (
                <div className="p-3 text-sm text-muted-foreground">
                  No brands found matching "{searchQuery}"
                </div>
              ) : (
                <div className="p-3 text-sm text-muted-foreground">
                  Start typing to search brands
                </div>
              )}

              <div className="border-t p-2">
                {showCreateForm ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="New brand name"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateBrand();
                        }
                        if (e.key === "Escape") {
                          setShowCreateForm(false);
                          setNewBrandName("");
                        }
                      }}
                      autoFocus
                      data-testid="input-new-brand-name"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateBrand}
                        disabled={!newBrandName.trim() || createBrandMutation.isPending}
                        data-testid="button-confirm-create-brand"
                      >
                        {createBrandMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Create"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewBrandName("");
                        }}
                        data-testid="button-cancel-create-brand"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setShowCreateForm(true)}
                    data-testid="button-create-new-brand"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create new brand
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
