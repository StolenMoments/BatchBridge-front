import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  withCredentials: false
})

api.interceptors.response.use(
    res => res,
    err => {
      console.error('API Error:', err.response?.data)
      return Promise.reject(err)
    }
)

export default api