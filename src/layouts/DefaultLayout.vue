<template>
  <div class="layout">
    <AppHeader />
    <div class="main-container">
      <AppSidebar />
      <main class="content">
        <RouterView />
        <Notifications />
      </main>
    </div>
  </div>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import Notifications from "@/composables/Notifications.vue";
</script>

<style scoped>
.layout { display: flex; flex-direction: column; min-height: 100vh; width: 100%; margin: 0; padding: 0; }
.main-container { display: flex; flex: 1; width: 100%; max-width: none; margin: 0; }
.content { flex: 1; width: 100%; max-width: none; min-width: 0; padding: 24px; background: #f8f9fa; box-sizing: border-box; }
</style>
