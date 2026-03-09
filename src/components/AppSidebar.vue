<template>
  <aside class="sidebar">
    <RouterLink to="/jobs" class="sidebar-link">📋 Batch List</RouterLink>
    <RouterLink to="/upload" class="sidebar-link">⬆️ New Upload</RouterLink>
    <RouterLink to="/upload-table" class="sidebar-link">🧾 Table Upload</RouterLink>
  </aside>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.sidebar { width: 240px; min-width: 240px; background: #2c2c2c; color: white; padding-top: 24px; display: flex; flex-direction: column; box-sizing: border-box; }
.sidebar-link { padding: 16px 24px; color: white; text-decoration: none; display: block; }
.sidebar-link:hover, .router-link-active { background: #3a3a3a; }
</style>