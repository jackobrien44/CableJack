import { api } from './client'
import type { CategoryResponse, PagedResult } from '../types/api'

export interface CreateCategoryRequest {
  name: string
  sortOrder?: number
}

export interface UpdateCategoryRequest {
  name?: string
  sortOrder?: number
}

export const categoriesApi = {
  getAll: () => api.get<PagedResult<CategoryResponse>>('/categories?pageSize=200'),
  create: (req: CreateCategoryRequest) => api.post<CategoryResponse>('/categories', req),
  update: (id: number, req: UpdateCategoryRequest) => api.put<CategoryResponse>(`/categories/${id}`, req),
  delete: (id: number) => api.delete<void>(`/categories/${id}`),
  deleteAll: () => api.delete<{ deleted: number }>('/categories'),
}
