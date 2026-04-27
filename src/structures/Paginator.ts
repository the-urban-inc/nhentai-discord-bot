// Compatibility shim: re-exports GalleryPaginator as Paginator for existing imports.
export { GalleryPaginator as Paginator } from './paginators';
export type { GalleryPaginatorOptions as PaginatorOptions } from './paginators';
export { Interactions, Views, Info } from './paginators/GalleryPaginator';
