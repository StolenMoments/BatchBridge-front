<template>
  <header class="header">
    <div class="logo">BatchBridge</div>
    <nav>
      <RouterLink to="/jobs" class="nav-link">Jobs</RouterLink>
      <RouterLink to="/upload" class="nav-link">Upload</RouterLink>
      <RouterLink to="/upload-table" class="nav-link">Table Upload</RouterLink>
    </nav>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.header { background: #1a1a1a; color: white; padding: 0 24px; height: 64px; display: flex; align-items: center; gap: 32px; width: 100%; box-sizing: border-box; }
.logo { font-size: 1.5rem; font-weight: bold; }
.nav-link { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; }
.nav-link:hover, .router-link-active { background: #333; }
</style>