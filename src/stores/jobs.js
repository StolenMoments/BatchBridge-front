import { defineStore } from 'pinia'
import api from '@/api'

export const useJobsStore = defineStore('jobs', {
  state: () => ({
    jobs: [],
    loading: false,
    filters: { model: '', status: '' },
    pagination: { page: 0, size: 20, total: 0 }
  }),

  actions: {
    async fetchJobs() {
      this.loading = true
      try {
        const params = {
          model: this.filters.model || undefined,
          status: this.filters.status || undefined,
          page: this.pagination.page,
          size: this.pagination.size
        }
        const { data } = await api.get('/jobs', { params })
        this.jobs = data.data.jobs
        this.pagination.total = data.data.total
      } catch (err) {
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    setFilter(key, value) {
      this.filters[key] = value
      this.pagination.page = 0
      this.fetchJobs()
    },

    setPage(page) {
      this.pagination.page = page
      this.fetchJobs()
    }
  }
})