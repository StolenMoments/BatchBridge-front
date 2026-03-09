<template>
  <div class="table-upload-page">
    <h1>Table Batch Upload</h1>
    <p class="subtext">기존 파일 업로드와 동일한 필드로 테이블에 직접 입력해 배치를 생성합니다.</p>

    <div class="upload-form">
      <div class="form-fields">
        <label for="filename">Filename</label>
        <input id="filename" v-model="filename" type="text" placeholder="batch-table-input.csv" />

        <label for="defaultModel">Default Model</label>
        <select id="defaultModel" v-model="defaultModel">
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
          <option value="grok">Grok</option>
        </select>

        <label for="systemPrompt">System Prompt (optional)</label>
        <textarea id="systemPrompt" v-model="systemPrompt" placeholder="You are a helpful assistant." />
      </div>

      <div class="table-header">
        <h2>Rows</h2>
        <button type="button" class="btn-secondary" @click="addRow">+ Add Row</button>
      </div>

      <div class="table-scroll-wrapper">
        <table class="input-table">
          <thead>
          <tr>
            <th>id</th>
            <th>prompt <span class="required">*</span></th>
            <th>model</th>
            <th>system_prompt</th>
            <th>temperature</th>
            <th>max_tokens</th>
            <th></th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(row, index) in rows" :key="index">
            <td><input v-model="row.id" type="text" placeholder="row_001" /></td>
            <td><textarea v-model="row.prompt" rows="2" placeholder="질문 또는 요청을 입력하세요" /></td>
            <td>
              <select v-model="row.model">
                <option value="">(default)</option>
                <option value="claude">claude</option>
                <option value="gemini">gemini</option>
                <option value="grok">grok</option>
              </select>
            </td>
            <td><textarea v-model="row.system_prompt" rows="2" placeholder="optional" /></td>
            <td><input v-model="row.temperature" type="number" min="0" max="1" step="0.1" placeholder="0.7" /></td>
            <td><input v-model="row.max_tokens" type="number" min="1" step="1" placeholder="256" /></td>
            <td>
              <button type="button" class="btn-remove" @click="removeRow(index)" :disabled="rows.length === 1">삭제</button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <button class="btn-submit" :disabled="loading" @click="uploadTableForPreview">
        {{ loading ? 'Uploading...' : 'Upload Table (Preview)' }}
      </button>

      <div v-if="previewData" class="preview-section">
        <h2>Preview</h2>

        <div class="table-scroll-wrapper">
          <table class="preview-table">
            <thead>
            <tr>
              <th v-for="col in previewData.columns" :key="col">{{ col }}</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(row, idx) in previewData.preview" :key="idx">
              <td v-for="col in previewData.columns" :key="col">{{ row[col] || '-' }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div class="preview-meta">
          <p>Total Rows: {{ previewData.totalRows }}</p>
          <p>
            Estimated Tokens:
            Claude {{ previewData.estimatedTokens.claude }},
            Gemini {{ previewData.estimatedTokens.gemini }},
            Grok {{ previewData.estimatedTokens.grok }}
          </p>
          <p>Estimated Cost: ${{ previewData.estimatedCost.total.toFixed(3) }}</p>
        </div>

        <button class="btn-submit" :disabled="submitting" @click="submitBatch">
          {{ submitting ? 'Submitting...' : 'Submit Batch' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { useNotifications } from '@/composables/useNotifications'

const { addNotification } = useNotifications()
const router = useRouter()

const filename = ref('batch-table-input.csv')
const defaultModel = ref('claude')
const systemPrompt = ref('')
const loading = ref(false)
const submitting = ref(false)
const previewData = ref(null)

const createEmptyRow = () => ({
  id: '',
  prompt: '',
  model: '',
  system_prompt: '',
  temperature: '',
  max_tokens: ''
})

const rows = ref([createEmptyRow()])

watch([rows, filename], () => {
  previewData.value = null
}, { deep: true })

const addRow = () => {
  rows.value.push(createEmptyRow())
}

const removeRow = (index) => {
  if (rows.value.length === 1) return
  rows.value.splice(index, 1)
}

const buildRowsPayload = () => rows.value
    .filter((row) => row.prompt?.trim())
    .map((row) => {
      const payloadRow = { prompt: row.prompt.trim() }
      if (row.id?.trim()) payloadRow.id = row.id.trim()
      if (row.model) payloadRow.model = row.model
      if (row.system_prompt?.trim()) payloadRow.system_prompt = row.system_prompt.trim()
      if (row.temperature !== '' && row.temperature !== null) payloadRow.temperature = Number(row.temperature)
      if (row.max_tokens !== '' && row.max_tokens !== null) payloadRow.max_tokens = Number(row.max_tokens)
      return payloadRow
    })

const buildCsvContent = (payloadRows) => {
  const columns = ['id', 'prompt', 'model', 'system_prompt', 'temperature', 'max_tokens']
  const escapeCsv = (value) => {
    if (value === undefined || value === null) return ''
    const text = String(value)
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const header = columns.join(',')
  const body = payloadRows
      .map((row) => columns.map((column) => escapeCsv(row[column])).join(','))
      .join('\n')

  return `${header}\n${body}`
}

const uploadTableForPreview = async () => {
  const payloadRows = buildRowsPayload()

  if (!filename.value.trim()) {
    addNotification('Filename is required', 'error')
    return
  }

  if (!payloadRows.length) {
    addNotification('At least one row with prompt is required', 'error')
    return
  }

  loading.value = true
  try {
    const csvContent = buildCsvContent(payloadRows)
    const file = new File([csvContent], filename.value.trim(), { type: 'text/csv' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('defaultModel', defaultModel.value)
    formData.append('systemPrompt', systemPrompt.value)

    const { data } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    previewData.value = data.data
    addNotification('Table uploaded successfully!', 'success')
  } catch (err) {
    addNotification(err.response?.data?.error?.message || 'Table upload failed', 'error')
  } finally {
    loading.value = false
  }
}

const submitBatch = async () => {
  if (!previewData.value?.uploadId) return

  submitting.value = true
  try {
    const { data } = await api.post('/batches', {
      uploadId: previewData.value.uploadId,
      defaultModel: defaultModel.value,
      systemPrompt: systemPrompt.value
    })

    addNotification(`Batch submitted! Job ID: ${data.data.jobId}`, 'success')
    router.push('/jobs')
  } catch (err) {
    addNotification(err.response?.data?.error?.message || 'Submission failed', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.table-upload-page { padding: 24px; max-width: 1200px; width: 100%; box-sizing: border-box; }
.subtext { color: #667085; margin-bottom: 20px; }
.upload-form { margin-top: 20px; }
.form-fields { display: grid; gap: 12px; margin-bottom: 20px; }
.form-fields label { font-weight: 700; }
.form-fields input, .form-fields select, .form-fields textarea {
  padding: 10px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  font-size: 0.95rem;
}
.table-header { display: flex; justify-content: space-between; align-items: center; margin: 20px 0 10px; }
.table-scroll-wrapper { overflow-x: auto; }
.input-table { width: 100%; min-width: 1000px; border-collapse: collapse; }
.input-table th, .input-table td { border: 1px solid #e4e7ec; padding: 10px; vertical-align: top; }
.input-table th { background: #f9fafb; text-align: left; }
.input-table input, .input-table select, .input-table textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  padding: 8px;
  font-size: 0.9rem;
}
.required { color: #d92d20; }
.btn-secondary {
  background: #f2f4f7;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
}
.btn-remove {
  background: #fff1f1;
  border: 1px solid #fecaca;
  color: #b42318;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
}
.btn-submit {
  margin-top: 16px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  cursor: pointer;
}

.preview-section {
  margin-top: 28px;
}

.preview-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.preview-table th,
.preview-table td {
  padding: 12px;
  border: 1px solid #eee;
}

.preview-meta {
  margin: 8px 0 10px;
}
</style>
