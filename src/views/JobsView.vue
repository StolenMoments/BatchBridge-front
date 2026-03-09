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
        <option value="Pending">Pending</option>
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
          <button @click="viewResult(job.jobId)" class="btn">👁 View</button>
          <button @click="downloadResult(job.jobId)" class="btn">↓ Result</button>
          <button @click="deleteJob(job.jobId)" class="btn danger">Delete</button>
        </td>
      </tr>
      </tbody>
    </table>

    <div v-if="isResultModalOpen" class="modal-overlay" @click.self="closeResultModal">
      <div class="modal">
        <div class="modal-header">
          <h3>Result Preview ({{ activeResultJobId }})</h3>
          <div class="modal-actions">
            <button class="btn-copy" @click="copyResultColumn" :disabled="!canCopyResultColumn">📋 결과 복사</button>
            <button class="btn-close" @click="closeResultModal">✕</button>
          </div>
        </div>

        <div class="modal-body">
          <p v-if="!resultRows.length" class="empty-result">No data in result file.</p>
          <table v-else class="result-table">
            <thead>
            <tr>
              <th v-for="(header, index) in resultHeaders" :key="`header-${index}`">{{ header }}</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(row, rowIndex) in resultRows" :key="`row-${rowIndex}`">
              <td v-for="(value, colIndex) in row" :key="`cell-${rowIndex}-${colIndex}`">{{ value }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="pagination">
      <button :disabled="pagination.page === 0" @click="setPage(pagination.page - 1)">← Prev</button>
      <span>Page {{ pagination.page + 1 }} / {{ Math.ceil(pagination.total / pagination.size) }}</span>
      <button :disabled="(pagination.page + 1) * pagination.size >= pagination.total" @click="setPage(pagination.page + 1)">Next →</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useJobs } from '@/composables/useJobs'
import { useNotifications } from '@/composables/useNotifications'
import api from '@/api'

const { sortedJobs, filters, pagination, loading, fetchJobs, setFilter, setPage } = useJobs()

const { addNotification } = useNotifications()

const isResultModalOpen = ref(false)
const activeResultJobId = ref('')
const resultHeaders = ref([])
const resultRows = ref([])

const resultColumnIndex = computed(() => resultHeaders.value.findIndex((header) => String(header).trim().toLowerCase() === 'result'))
const canCopyResultColumn = computed(() => resultColumnIndex.value !== -1 && resultRows.value.length > 0)

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

const parseCsv = (csvText) => {
  const rows = []
  let currentRow = []
  let currentValue = ''
  let inQuotes = false

  const pushValue = () => {
    currentRow.push(currentValue)
    currentValue = ''
  }

  const pushRow = () => {
    pushValue()
    rows.push(currentRow)
    currentRow = []
  }

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      pushValue()
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1
      }
      pushRow()
      continue
    }

    currentValue += char
  }

  const hasRemainingData = currentValue.length > 0 || currentRow.length > 0
  if (hasRemainingData) {
    pushRow()
  }

  return rows
}

const viewResult = async (jobId) => {
  try {
    const response = await api.get(`/results/${jobId}`, { responseType: 'text' })
    const csvText = String(response.data || '')
    const parsedRows = parseCsv(csvText).filter((row) => row.length > 1 || row[0] !== '')

    if (!parsedRows.length) {
      resultHeaders.value = []
      resultRows.value = []
    } else {
      resultHeaders.value = parsedRows[0]
      resultRows.value = parsedRows.slice(1)
    }

    activeResultJobId.value = jobId
    isResultModalOpen.value = true
  } catch (err) {
    addNotification(err.response?.data?.error?.message || 'Failed to load result preview', 'error')
  }
}

const closeResultModal = () => {
  isResultModalOpen.value = false
}

const copyTextToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

const copyResultColumn = async () => {
  if (!canCopyResultColumn.value) {
    addNotification('복사할 result 컬럼 데이터가 없습니다.', 'error')
    return
  }

  const values = resultRows.value
    .map((row) => row[resultColumnIndex.value])
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
    .map((value) => String(value))

  if (!values.length) {
    addNotification('복사할 result 컬럼 데이터가 없습니다.', 'error')
    return
  }

  try {
    await copyTextToClipboard(values.join('\n'))
    addNotification(`result 컬럼 ${values.length}개를 클립보드에 복사했습니다.`, 'success')
  } catch {
    addNotification('클립보드 복사에 실패했습니다.', 'error')
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
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal {
  width: min(1000px, 92vw);
  max-height: 80vh;
  background: white;
  border-radius: 10px;
  overflow: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.modal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-copy {
  border: 1px solid #d9dce2;
  background: #f7f8fa;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
.btn-copy:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-close {
  border: none;
  background: transparent;
  font-size: 1rem;
  cursor: pointer;
}
.modal-body {
  overflow: visible;
  padding: 12px 16px 16px;
}
.result-table {
  width: 100%;
  border-collapse: collapse;
}
.result-table th,
.result-table td {
  border: 1px solid #eee;
  padding: 8px;
  text-align: left;
  vertical-align: top;
  white-space: pre-wrap;
  word-break: break-word;
}
.result-table th {
  background: #f7f8fa;
  position: sticky;
  top: 0;
}
.empty-result {
  margin: 0;
  color: #666;
}
</style>
