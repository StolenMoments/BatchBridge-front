import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { pinia } from './stores'
import router from "@/router/index.js";

createApp(App)
.use(router)
.use(pinia)                             // ← 추가
.mount('#app')