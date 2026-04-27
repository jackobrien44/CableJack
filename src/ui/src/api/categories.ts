import { api } from './client'
import type { CategoryResponse, PagedResult } from '../types/api'

export const categoriesApi = {
  getAll: () => api.get<PagedResult<CategoryResponse>>('/categories?pageSize=200'),
}
