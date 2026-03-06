import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const routes = [
  {
    path: '/',
    component: DefaultLayout,
    redirect: '/jobs',
    children: [
      { path: '/jobs', name: 'jobs', component: () => import('@/views/JobsView.vue') },
      { path: '/upload', name: 'upload', component: () => import('@/views/UploadView.vue') },
      { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router