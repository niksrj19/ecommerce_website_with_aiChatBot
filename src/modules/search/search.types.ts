export interface SearchHit {
  id: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  price: number;
  imageUrl: string;
  inStock: boolean;
  salesCount: number;
  isFeatured: boolean;
  score?: number;
}

export interface FacetResult {
  brands: { name: string; count: number }[];
  categories: { name: string; count: number }[];
  priceStats: { min: number; max: number; avg: number };
  priceRanges: { range: string; min: number; max: number; count: number }[];
  availability: { inStock: number; outOfStock: number };
}

export interface SearchResponse {
  hits: SearchHit[];
  facets: FacetResult;
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  performance: {
    tookMs: number;
    cached: boolean;
  };
}