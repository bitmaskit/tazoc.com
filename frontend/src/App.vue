<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'
import AppLayout from './components/AppLayout.vue'

const route = useRoute()
const showLayout = computed(() => route.path.startsWith('/app'))
</script>

<template>
  <div class="h-full">
    <AppLayout v-if="showLayout">
      <RouterView />
    </AppLayout>
    <RouterView v-else />
  </div>
</template>
