import { computed } from 'vue'
import { useJobsStore } from '@/stores/jobs'

export function useJobs() {
  const store = useJobsStore()

  const sortedJobs = computed(() =>
      [...store.jobs].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  )

  return {
    jobs: store.jobs,
    sortedJobs,
    filters: store.filters,
    pagination: store.pagination,
    loading: store.loading,
    fetchJobs: () => store.fetchJobs(),
    setFilter: (key, value) => store.setFilter(key, value),
    setPage: (page) => store.setPage(page)
  }
}