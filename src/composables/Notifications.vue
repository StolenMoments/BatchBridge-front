<template>
  <div class="notifications">
    <div v-for="notif in notifications" :key="notif.id" :class="`notif ${notif.type}`">
      {{ notif.message }}
    </div>
  </div>
</template>

<script setup>
import { useNotifications } from '@/composables/useNotifications'
const { notifications } = useNotifications()
</script>

<style scoped>
.notifications { position: fixed; top: 20px; right: 20px; z-index: 1000; }
.notif { padding: 12px 24px; margin-bottom: 12px; border-radius: 6px; color: white; }
.info { background: #007bff; }
.success { background: #28a745; }
.error { background: #dc3545; }
</style>