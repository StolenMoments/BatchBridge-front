<template>
  <div class="settings-page">
    <h1>API Key Settings</h1>

    <div v-for="model in models" :key="model" class="key-item">
      <h3>{{ model.charAt(0).toUpperCase() + model.slice(1) }}</h3>
      <input
          v-model="keys[model]"
          :type="showKeys[model] ? 'text' : 'password'"
          placeholder="Enter API Key"
          class="key-input"
      />
      <button @click="toggleShowKey(model)" class="btn-toggle">{{ showKeys[model] ? 'Hide' : 'Show' }}</button>
      <button @click="saveKey(model)" :disabled="saving[model]" class="btn-save">
        {{ saving[model] ? 'Saving...' : 'Save' }}
      </button>
      <button @click="verifyKey(model)" :disabled="verifying[model]" class="btn-verify">
        {{ verifying[model] ? 'Verifying...' : 'Verify' }}
      </button>
      <button @click="deleteKey(model)" class="btn-delete">Delete</button>
      <span v-if="verified[model]" class="status verified">✅ Verified</span>
      <span v-else-if="verified[model] === false" class="status invalid">❌ Invalid</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import { useNotifications } from '@/composables/useNotifications'

const { addNotification } = useNotifications()

const models = ['claude', 'gemini', 'grok']
const keys = ref({ claude: '', gemini: '', grok: '' })
const showKeys = ref({ claude: false, gemini: false, grok: false })
const verified = ref({ claude: null, gemini: null, grok: null })
const saving = ref({ claude: false, gemini: false, grok: false })
const verifying = ref({ claude: false, gemini: false, grok: false })

const fetchKeys = async () => {
  try {
    const { data } = await api.get('/settings/keys')
    data.data.forEach(item => {
      keys.value[item.model] = item.maskedKey || ''
      verified.value[item.model] = item.verified
    })
  } catch (err) {
    addNotification(err.response?.data?.error?.message || 'Failed to load keys', 'error')
  }
}

const toggleShowKey = (model) => {
  showKeys.value[model] = !showKeys.value[model]
}

const saveKey = async (model) => {
  if (!keys.value[model]) return
  saving.value[model] = true
  try {
    await api.put(`/settings/keys/${model}`, { apiKey: keys.value[model] })
    addNotification(`${model} key saved!`, 'success')
    await fetchKeys() // Refresh masked key
  } catch (err) {
    addNotification(err.response?.data?.error?.message || 'Save failed', 'error')
  } finally {
    saving.value[model] = false
  }
}

const verifyKey = async (model) => {
  verifying.value[model] = true
  try {
    const { data } = await api.post(`/settings/keys/${model}/verify`)
    verified.value[model] = data.data.verified
    addNotification(`${model} key ${data.data.verified ? 'verified' : 'invalid'}!`, data.data.verified ? 'success' : 'error')
  } catch (err) {
    addNotification(err.response?.data?.error?.message || 'Verification failed', 'error')
    verified.value[model] = false
  } finally {
    verifying.value[model] = false
  }
}

const deleteKey = async (model) => {
  if (!confirm(`Delete ${model} key?`)) return
  try {
    await api.delete(`/settings/keys/${model}`)
    keys.value[model] = ''
    verified.value[model] = null
    addNotification(`${model} key deleted`, 'success')
  } catch (err) {
    addNotification(err.response?.data?.error?.message || 'Delete failed', 'error')
  }
}

onMounted(fetchKeys)
</script>

<style scoped>
.settings-page { padding: 24px; }
.key-item { margin-bottom: 32px; padding: 16px; border: 1px solid #eee; border-radius: 8px; }
.key-input { width: 300px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-right: 8px; }
.btn-toggle, .btn-save, .btn-verify, .btn-delete { padding: 8px 16px; margin-right: 8px; border: none; border-radius: 6px; cursor: pointer; }
.btn-save { background: #218838; color: white; }
.btn-verify { background: #ffc107; color: black; }
.btn-delete { background: #dc3545; color: white; }
.status { margin-left: 16px; font-weight: bold; }
.verified { color: green; }
.invalid { color: red; }
</style>