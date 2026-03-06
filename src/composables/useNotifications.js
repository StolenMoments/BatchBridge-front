import { ref } from 'vue'

export function useNotifications() {
  const notifications = ref([])

  const addNotification = (message, type = 'info') => {
    const id = Date.now()
    notifications.value.push({ id, message, type })
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    }, 5000)
  }

  return { notifications, addNotification }
}