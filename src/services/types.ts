// Shapes shared by more than one feature.

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface Place {
  lat: number;
  lng: number;
  address?: string;
}
