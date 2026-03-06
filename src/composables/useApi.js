import { ref } from 'vue'
import api from '@/api'

export function useApi() {
  const loading = ref(false)
  const error = ref(null)

  const request = async (method, url, data = null, params = null) => {
    loading.value = true
    error.value = null
    try {
      const res = await api({ method, url, data, params })
      return res.data
    } catch (err) {
      error.value = err.response?.data?.error?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return { loading, error, request }
}