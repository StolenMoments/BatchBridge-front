<template>
  <div class="upload-page">
    <h1>Upload Batch File</h1>

    <div class="file-format-info">
      <p><strong>Supported file formats:</strong> <code>.xlsx</code>, <code>.ods</code>, <code>.csv</code>, <code>.jsonl</code></p>
      <p><strong>Required columns:</strong> <code>prompt</code> (user message)</p>
      <p><strong>Optional columns:</strong> <code>id</code> (unique row ID), <code>model</code> (claude/gemini/grok), <code>system_prompt</code>, <code>temperature</code> (0.0-1.0), <code>max_tokens</code></p>
    </div>

    <!-- File Format Examples Section -->
    <div class="format-examples">
      <h2>파일 형식 예시</h2>

      <div class="format-tabs">
        <button
            v-for="fmt in formats"
            :key="fmt.id"
            class="tab-btn"
            :class="{ active: activeFormat === fmt.id }"
            @click="activeFormat = fmt.id"
        >
          {{ fmt.label }}
        </button>
      </div>

      <!-- .xlsx / .ods / .csv — Unified Table Preview -->
      <div v-if="activeFormat === 'table'" class="example-block">
        <div class="example-table-wrapper">
          <table class="example-table">
            <thead>
            <tr>
              <th v-for="col in exampleColumns" :key="col.key" :class="col.required ? 'col-required' : 'col-optional'">
                {{ col.key }}
                <span class="col-badge" v-if="col.required">필수</span>
                <span class="col-badge optional" v-else>선택</span>
              </th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(row, i) in exampleRows" :key="i">
              <td v-for="col in exampleColumns" :key="col.key">{{ row[col.key] ?? '-' }}</td>
            </tr>
            </tbody>
          </table>
        </div>
        <p class="example-note">
          첫 번째 행을 헤더로 인식합니다. .xlsx는 첫 번째 시트만 읽으며, .csv는 UTF-8 / EUC-KR 인코딩을 자동 감지합니다.
        </p>
      </div>

      <!-- .jsonl — Code Preview -->
      <div v-else class="example-block">
        <div class="jsonl-preview">
          <pre v-for="(line, i) in jsonlExampleLines" :key="i" class="jsonl-line"><span class="jsonl-num">{{ i + 1 }}</span><span class="jsonl-text">{{ line }}</span></pre>
        </div>
        <p class="example-note">
          각 줄이 독립적인 JSON 객체여야 합니다. <code>prompt</code> 필드는 필수입니다. <code>id</code>는 선택사항입니다.
        </p>
      </div>

      <!-- Column Description -->
      <div class="column-desc">
        <h3>컬럼 설명</h3>
        <div class="table-scroll-wrapper">
        <table class="desc-table">
          <thead>
          <tr>
            <th>컬럼명</th>
            <th>필수 여부</th>
            <th>타입</th>
            <th>설명</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="col in columnDescriptions" :key="col.key">
            <td><code>{{ col.key }}</code></td>
            <td><span class="col-badge" :class="{ optional: !col.required }">{{ col.required ? '필수' : '선택' }}</span></td>
            <td>{{ col.type }}</td>
            <td>{{ col.desc }}</td>
          </tr>
          </tbody>
        </table>
      </div>
      </div>
    </div>
    <!-- End File Format Examples -->

    <div class="upload-form">
      <!-- Drag & Drop Area -->
      <div
          class="drop-zone"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
          :class="{ 'drag-over': dragOver }"
      >
        <input type="file" ref="fileInput" @change="onFileChange" hidden accept=".xlsx,.ods,.csv,.jsonl" />
        <p v-if="!selectedFile">Drag & drop file here or <button @click="triggerFileInput">browse</button></p>
        <p v-else>{{ selectedFile.name }} selected</p>
      </div>

      <!-- Form Fields -->
      <div class="form-fields">
        <label for="defaultModel">Default Model</label>
        <select id="defaultModel" v-model="defaultModel">
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
          <option value="grok">Grok</option>
        </select>

        <label for="systemPrompt">System Prompt (optional)</label>
        <textarea id="systemPrompt" v-model="systemPrompt" placeholder="You are a helpful assistant."></textarea>
      </div>

      <!-- Upload Button -->
      <button @click="uploadFile" :disabled="!selectedFile || loading" class="btn-upload">
        {{ loading ? 'Uploading...' : 'Upload & Preview' }}
      </button>
    </div>

    <!-- Preview Section -->
    <div v-if="previewData" class="preview-section">
      <h2>Preview (First 5 Rows)</h2>
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

      <div class="stats">
        <p>Total Rows: {{ previewData.totalRows }}</p>
        <p>Estimated Tokens: Claude {{ previewData.estimatedTokens.claude }}, Gemini {{ previewData.estimatedTokens.gemini }}, Grok {{ previewData.estimatedTokens.grok }}</p>
        <p>Estimated Cost: ${{ previewData.estimatedCost.total.toFixed(3) }}</p>
      </div>

      <!-- Submit Batch Button -->
      <button @click="submitBatch" :disabled="submitting" class="btn-submit">
        {{ submitting ? 'Submitting...' : 'Submit Batch' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api'
import { useNotifications } from '@/composables/useNotifications'
import { useRouter } from 'vue-router'

const { addNotification } = useNotifications()
const router = useRouter()

// ─── Upload state ───────────────────────────────────────────────
const dragOver = ref(false)
const selectedFile = ref(null)
const defaultModel = ref('claude')
const systemPrompt = ref('')
const previewData = ref(null)
const loading = ref(false)
const submitting = ref(false)
const fileInput = ref(null)

// ─── Format Examples state ──────────────────────────────────────
const activeFormat = ref('table')

const formats = [
  { id: 'table', label: '.xlsx / .ods / .csv' },
  { id: 'jsonl', label: '.jsonl' },
]

const exampleColumns = [
  { key: 'id',            required: false  },
  { key: 'prompt',        required: true  },
  { key: 'model',         required: false },
  { key: 'system_prompt', required: false },
  { key: 'temperature',   required: false },
  { key: 'max_tokens',    required: false },
]

const exampleRows = [
  { id: 'row_001', prompt: '대한민국의 수도는 어디인가요?',      model: 'claude',  system_prompt: '친절한 어시스턴트입니다.', temperature: 0.7, max_tokens: 256  },
  { id: 'row_002', prompt: 'Explain quantum computing briefly.', model: 'gemini',  system_prompt: '',                         temperature: 0.5, max_tokens: 512  },
  { id: 'row_003', prompt: '파이썬으로 피보나치 수열 코드 작성', model: 'grok',    system_prompt: 'You are a coding expert.',  temperature: 0.3, max_tokens: 1024 },
  { id: 'row_004', prompt: 'Summarize the theory of relativity.', model: '',       system_prompt: '',                         temperature: '',  max_tokens: ''   },
]

const jsonlExampleLines = [
  '{"id": "row_001", "prompt": "대한민국의 수도는 어디인가요?", "model": "claude", "system_prompt": "친절한 어시스턴트입니다.", "temperature": 0.7, "max_tokens": 256}',
  '{"id": "row_002", "prompt": "Explain quantum computing briefly.", "model": "gemini", "temperature": 0.5, "max_tokens": 512}',
  '{"id": "row_003", "prompt": "파이썬으로 피보나치 수열 코드 작성", "model": "grok", "system_prompt": "You are a coding expert.", "temperature": 0.3, "max_tokens": 1024}',
  '{"id": "row_004", "prompt": "Summarize the theory of relativity."}',
]

const columnDescriptions = [
  { key: 'id',            required: false,  type: 'string',  desc: '행을 고유하게 식별하는 ID. 결과 파일에서 원본 행과 매핑에 사용됩니다.' },
  { key: 'prompt',        required: true,  type: 'string',  desc: '모델에 전달할 유저 메시지입니다.' },
  { key: 'model',         required: false, type: 'string',  desc: 'claude / gemini / grok 중 하나. 비워두면 업로드 시 선택한 기본 모델이 적용됩니다.' },
  { key: 'system_prompt', required: false, type: 'string',  desc: '행별로 다른 시스템 프롬프트를 지정할 수 있습니다.' },
  { key: 'temperature',   required: false, type: 'number',  desc: '0.0 ~ 1.0 사이의 실수. 생략 시 모델 기본값을 사용합니다.' },
  { key: 'max_tokens',    required: false, type: 'integer', desc: '최대 출력 토큰 수. 생략 시 모델 기본값을 사용합니다.' },
]

// ─── Upload handlers ────────────────────────────────────────────
const triggerFileInput = () => fileInput.value.click()

const onDrop = (e) => {
  dragOver.value = false
  const file = e.dataTransfer.files[0]
  if (file && validateFileType(file)) selectedFile.value = file
}

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (file && validateFileType(file)) selectedFile.value = file
}

const validateFileType = (file) => {
  const ext = file.name.split('.').pop().toLowerCase()
  if (!['xlsx', 'ods', 'csv', 'jsonl'].includes(ext)) {
    addNotification('Invalid file type. Supported: .xlsx, .ods, .csv, .jsonl', 'error')
    return false
  }
  return true
}

const uploadFile = async () => {
  if (!selectedFile.value) return
  loading.value = true
  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('defaultModel', defaultModel.value)
  formData.append('systemPrompt', systemPrompt.value)

  try {
    const { data } = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    previewData.value = data.data
    addNotification('File uploaded successfully!', 'success')
  } catch (err) {
    addNotification(err.response?.data?.error?.message || 'Upload failed', 'error')
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
.upload-page { padding: 24px; max-width: 1100px; width: 100%; box-sizing: border-box; }


.table-scroll-wrapper {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
}

/* ── File format info ── */
.file-format-info {
  margin: 24px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #0066cc;
}
.file-format-info p { margin: 8px 0; line-height: 1.5; }
.file-format-info code {
  background: #e9ecef;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

/* ── Format Examples Section ── */
.format-examples {
  margin: 32px 0;
  padding: 24px;
  background: #fff;
  border: 1px solid #e0e4ea;
  border-radius: 10px;
}
.format-examples h2 { margin: 0 0 20px; font-size: 1.1rem; color: #1a1a2e; }

/* Tabs */
.format-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.tab-btn {
  padding: 7px 18px;
  border: 1px solid #d0d5dd;
  border-radius: 20px;
  background: #f5f7fa;
  color: #555;
  font-size: 0.88rem;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.18s;
}
.tab-btn:hover { border-color: #0066cc; color: #0066cc; }
.tab-btn.active { background: #0066cc; color: #fff; border-color: #0066cc; }

/* Example block */
.example-block { margin-bottom: 28px; }

.example-table-wrapper { overflow-x: auto; }
.example-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  min-width: 700px;
}
.example-table th {
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
  font-family: monospace;
  font-size: 0.9rem;
  position: relative;
}
.example-table th.col-required { background: #eef4ff; color: #0044aa; border-bottom: 2px solid #0066cc; }
.example-table th.col-optional { background: #f7f8fa; color: #555; border-bottom: 2px solid #d0d5dd; }
.example-table td {
  padding: 9px 14px;
  border-bottom: 1px solid #eee;
  color: #333;
  font-size: 0.87rem;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.example-table tr:last-child td { border-bottom: none; }
.example-table tr:hover td { background: #f0f6ff; }

/* Badges */
.col-badge {
  display: inline-block;
  margin-left: 5px;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-family: sans-serif;
  font-weight: 600;
  background: #0066cc;
  color: #fff;
  vertical-align: middle;
}
.col-badge.optional { background: #aab4c2; }

/* JSONL preview */
.jsonl-preview {
  background: #1e1e2e;
  border-radius: 8px;
  padding: 16px 20px;
  overflow-x: auto;
}
.jsonl-line {
  display: flex;
  gap: 16px;
  margin: 0;
  padding: 4px 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.82rem;
  line-height: 1.7;
  white-space: pre;
}
.jsonl-num { color: #565f89; min-width: 20px; user-select: none; }
.jsonl-text { color: #a9b1d6; }

/* Note */
.example-note {
  margin-top: 12px;
  font-size: 0.85rem;
  color: #666;
  padding: 10px 14px;
  background: #fffbea;
  border-left: 3px solid #f5a623;
  border-radius: 4px;
}
.example-note code {
  background: #f0e8d0;
  padding: 0.1em 0.35em;
  border-radius: 3px;
  font-family: monospace;
}

/* Column description table */
.column-desc h3 { font-size: 0.95rem; margin: 0 0 12px; color: #333; }
.desc-table { width: 100%; min-width: 720px; border-collapse: collapse; font-size: 0.87rem; }
.desc-table th {
  text-align: left;
  padding: 9px 14px;
  background: #f2f4f8;
  color: #444;
  font-weight: 600;
  border-bottom: 2px solid #d8dce5;
}
.desc-table td { padding: 9px 14px; border-bottom: 1px solid #eee; color: #444; vertical-align: top; }
.desc-table tr:last-child td { border-bottom: none; }
.desc-table code {
  background: #eef0f5;
  padding: 0.1em 0.4em;
  border-radius: 3px;
  font-family: monospace;
  color: #0044aa;
}

/* ── Upload form ── */
.upload-form { margin-top: 32px; }
.drop-zone {
  border: 2px dashed #ccc;
  padding: 48px;
  text-align: center;
  border-radius: 8px;
  margin-bottom: 24px;
}
.drag-over { border-color: #007bff; background: #e7f3ff; }
.form-fields { display: grid; gap: 16px; margin-bottom: 24px; }
.form-fields label { font-weight: bold; }
.form-fields select, .form-fields textarea {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.btn-upload, .btn-submit {
  background: #0066cc;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* ── Preview section ── */
.preview-table { width: 100%; min-width: 640px; border-collapse: collapse; margin-bottom: 24px; }
.preview-table th, .preview-table td { padding: 12px; border: 1px solid #eee; }
.stats { margin-bottom: 24px; }
</style>
