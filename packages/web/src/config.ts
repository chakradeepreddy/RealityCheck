// Central API configuration — Vite replaces import.meta.env at build time
export const API_BASE_URL: string = import.meta.env?.VITE_API_BASE_URL ?? 'http://127.0.0.1:3001';



