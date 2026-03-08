<template>
  <div>
    <div class="filters">
      <select v-model="filters.model" @change="setFilter('model', filters.model)">
        <option value="">All Models</option>
        <option value="claude">Claude</option>
        <option value="gemini">Gemini</option>
        <option value="grok">Grok</option>
      </select>

      <select v-model="filters.status" @change="setFilter('status', filters.status)">
        <option value="">All Status</option>
        <option value="queued">Queued</option>
        <option value="running">Running</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
        <option value="partial">Partial</option>
      </select>

      <button @click="refreshJobs" class="btn-refresh">↻ Refresh</button>
    </div>

    <table class="jobs-table">
      <thead>
      <tr>
        <th>Job ID</th>
        <th>Filename</th>
        <th>Model</th>
        <th>Rows</th>
        <th>Status</th>
        <th>Submitted</th>
        <th>Actions</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="job in sortedJobs" :key="job.jobId">
        <td>{{ job.jobId }}</td>
        <td>{{ job.filename }}</td>
        <td>{{ job.models?.join(', ') || job.model }}</td>
        <td>{{ job.totalRows }} <small>({{ job.completedRows }} done)</small></td>
        <td><span :class="`status ${job.status}`">{{ job.status }}</span></td>
        <td>{{ formatDate(job.submittedAt) }}</td>
        <td>
          <button @click="downloadResult(job.jobId)" class="btn">↓ Result</button>
          <button @click="deleteJob(job.jobId)" class="btn danger">Delete</button>
        </td>
      </tr>
      </tbody>
    </table>

    <div class="pagination">
      <button :disabled="pagination.page === 0" @click="setPage(pagination.page - 1)">← Prev</button>
      <span>Page {{ pagination.page + 1 }} / {{ Math.ceil(pagination.total / pagination.size) }}</span>
      <button :disabled="(pagination.page + 1) * pagination.size >= pagination.total" @click="setPage(pagination.page + 1)">Next →</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useJobs } from '@/composables/useJobs'
import { useNotifications } from '@/composables/useNotifications'
import api from '@/api'

const { sortedJobs, filters, pagination, loading, fetchJobs, setFilter, setPage } = useJobs()

const { addNotification } = useNotifications()

const formatDate = (iso) => new Date(iso).toLocaleString('ko-KR')

const refreshJobs = async () => {
  try {
    await api.post('/batches/refresh')
    await fetchJobs()
    addNotification('Batches refreshed successfully', 'success')
  } catch (err) {
    addNotification(err.response?.data?.error?.message || 'Failed to refresh batches', 'error')
  }
}

const downloadResult = async (jobId) => {
  try {
    const response = await api.get(`/results/${jobId}`, { responseType: 'blob' })
    const blob = new Blob([response.data])
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `result-${jobId}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    addNotification('Download started', 'success')
  } catch (err) {
    addNotification(err.response?.data?.error?.message || 'Download failed', 'error')
  }
}

const deleteJob = async (jobId) => {
  if (!confirm('Delete this job?')) return
  try {
    await api.delete(`/jobs/${jobId}`)
    addNotification('Job deleted successfully', 'success')
    fetchJobs()
  } catch (err) {
    addNotification(err.response?.data?.error?.message || 'Delete failed', 'error')
  }
}

onMounted(() => fetchJobs())
</script>

<style scoped>
.filters { margin-bottom: 16px; display: flex; gap: 12px; }
.jobs-table { width: 100%; border-collapse: collapse; background: white; }
.jobs-table th, .jobs-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
.status { padding: 4px 10px; border-radius: 999px; font-size: 0.8em; }
.status.completed { background: #d4edda; color: #155724; }
.status.running { background: #fff3cd; color: #856404; }
.btn { padding: 6px 12px; margin-right: 6px; border: none; border-radius: 6px; cursor: pointer; }
.btn-refresh { background: #0056b3; color: white; }
.pagination { margin-top: 16px; display: flex; gap: 12px; align-items: center; }
</style>
