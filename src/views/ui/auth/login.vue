<template>
  <FullScreenLayout>
    <main
      class="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] dark:bg-gray-900"
    >
      <!-- Form side -->
      <section class="relative isolate flex flex-col overflow-hidden px-6 py-8 sm:px-12 lg:px-16">
        <img
          src="/img/logo-map.png"
          alt=""
          aria-hidden="true"
          class="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[36rem] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 opacity-10 select-none dark:opacity-[0.07]"
        />

        <router-link
          to="/"
          class="inline-flex w-fit items-center gap-3"
          aria-label="BIS Portal home"
        >
          <img src="/img/logo.png" alt="Barangay logo" class="h-14 w-auto" />
       
        </router-link>

        <div class="flex flex-1 items-center py-10">
          <div class="mx-auto w-full max-w-sm">
            <h1
              class="font-display text-3xl font-semibold tracking-tight text-[#0f2a4a] dark:text-white"
            >
              Sign in
            </h1>
            <p class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Use the username and password to access the Barangay Information System.
            </p>

            <div
              v-if="errorMessage"
              role="alert"
              class="mt-6 rounded-lg border border-[#c8323c]/30 bg-[#c8323c]/5 px-4 py-3 text-sm text-[#a5262f] dark:text-red-300"
            >
              {{ errorMessage }}
            </div>

            <form class="mt-8 space-y-5" novalidate @submit.prevent="handleSubmit">
              <div>
                <label
                  for="username"
                  class="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200"
                >
                  Username
                </label>
                <input
                  id="username"
                  v-model.trim="username"
                  type="text"
                  name="username"
                  autocomplete="username"
                  autocapitalize="none"
                  spellcheck="false"
                  placeholder="e.g. jdelacruz"
                  :aria-invalid="!!fieldErrors.username"
                  :class="[inputClass, fieldErrors.username ? errorBorder : '']"
                />
                <p
                  v-if="fieldErrors.username"
                  class="mt-1.5 text-sm text-[#a5262f] dark:text-red-300"
                >
                  {{ fieldErrors.username }}
                </p>
              </div>

              <div>
                <div class="mb-1.5 flex items-baseline justify-between">
                  <label
                    for="password"
                    class="block text-sm font-medium text-gray-800 dark:text-gray-200"
                  >
                    Password
                  </label>
                  <router-link
                    to="/reset-password"
                    class="text-sm font-medium text-[#1d5aa6] underline-offset-2 hover:underline dark:text-sky-300"
                  >
                    Forgot password?
                  </router-link>
                </div>
                <div class="relative">
                  <input
                    id="password"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    name="password"
                    autocomplete="current-password"
                    placeholder="Enter your password"
                    :aria-invalid="!!fieldErrors.password"
                    :class="[inputClass, 'pr-12', fieldErrors.password ? errorBorder : '']"
                  />
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-gray-500 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0f2a4a] dark:text-gray-400 dark:hover:text-white"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    :aria-pressed="showPassword"
                    @click="togglePasswordVisibility"
                  >
                    <svg
                      v-if="!showPassword"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg
                      v-else
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 3l18 18" />
                      <path
                        d="M10.6 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1"
                      />
                      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                    </svg>
                  </button>
                </div>
                <p
                  v-if="fieldErrors.password"
                  class="mt-1.5 text-sm text-[#a5262f] dark:text-red-300"
                >
                  {{ fieldErrors.password }}
                </p>
              </div>

              <label
                for="keepLoggedIn"
                class="flex w-fit cursor-pointer select-none items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  id="keepLoggedIn"
                  v-model="keepLoggedIn"
                  type="checkbox"
                  class="h-5 w-5 cursor-pointer rounded-md border-gray-300 accent-[#0f2a4a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f2a4a]"
                />
                Keep me signed in on this device
              </label>

              <button
                type="submit"
                :disabled="loading"
                class="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0f2a4a] px-4 text-sm font-semibold text-white transition hover:bg-[#173d69] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f2a4a] active:bg-[#0b2039] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#e0a526] dark:text-[#0f2a4a] dark:hover:bg-[#eab446]"
              >
                <svg
                  v-if="loading"
                  class="spinner h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 3a9 9 0 1 0 9 9" />
                </svg>
                {{ loading ? 'Signing in…' : 'Sign in' }}
              </button>
            </form> 
          </div>
        </div>

    
      </section>

      <!-- Map side -->
      <aside
        class="relative hidden overflow-hidden bg-[#0f2a4a] lg:block"
        aria-label="Barangay Information System"
      >
        <svg
          class="absolute inset-0 h-full w-full"
          viewBox="0 0 640 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <!-- Blocks -->
          <g fill="#ffffff" fill-opacity="0.045">
            <rect x="40" y="70" width="150" height="110" rx="6" />
            <rect x="230" y="70" width="170" height="110" rx="6" />
            <rect x="450" y="70" width="150" height="150" rx="6" />
            <rect x="40" y="230" width="150" height="170" rx="6" />
            <rect x="230" y="230" width="90" height="170" rx="6" />
            <rect x="360" y="260" width="110" height="140" rx="6" />
            <rect x="60" y="460" width="130" height="150" rx="6" />
            <rect x="230" y="460" width="170" height="90" rx="6" />
            <rect x="450" y="470" width="150" height="180" rx="6" />
            <rect x="60" y="670" width="240" height="140" rx="6" />
            <rect x="350" y="700" width="250" height="110" rx="6" />
          </g>

          <!-- Creek -->
          <path
            class="draw"
            d="M-20 610 C 120 560, 200 660, 320 630 S 520 560, 660 600"
            fill="none"
            stroke="#5aa4e0"
            stroke-opacity="0.45"
            stroke-width="14"
            stroke-linecap="round"
            pathLength="1"
          />

          <!-- Streets -->
          <g
            fill="none"
            stroke="#ffffff"
            stroke-opacity="0.18"
            stroke-width="3"
            stroke-linecap="round"
          >
            <path class="draw" pathLength="1" d="M210 0 V900" />
            <path class="draw" pathLength="1" d="M425 0 V900" />
            <path class="draw" pathLength="1" d="M0 205 H640" />
            <path class="draw" pathLength="1" d="M0 430 H640" />
            <path class="draw" pathLength="1" d="M0 830 H640" />
            <path class="draw" pathLength="1" d="M320 205 V430" stroke-width="2" />
          </g>

          <!-- Main road -->
          <path
            class="draw"
            pathLength="1"
            d="M-20 330 C 160 300, 260 440, 430 420 S 600 330, 680 350"
            fill="none"
            stroke="#e0a526"
            stroke-opacity="0.85"
            stroke-width="5"
            stroke-linecap="round"
          />

          <!-- Purok labels -->
          <g
            fill="#ffffff"
            fill-opacity="0.55"
            font-family="'Public Sans', system-ui, sans-serif"
            font-size="13"
            font-weight="500"
          >
            <text x="60" y="130">Purok 1</text>
            <text x="250" y="130">Purok 2</text>
            <text x="470" y="150">Purok 3</text>
            <text x="60" y="320">Purok 4</text>
            <text x="480" y="560">Purok 5</text>
            <text x="80" y="540">Purok 6</text>
            <text x="90" y="750">Purok 7</text>
          </g>

          <!-- Barangay hall marker -->
          <g class="pin" transform="translate(330 330)">
            <circle class="pulse" r="10" fill="#e0a526" fill-opacity="0.35" />
            <circle r="9" fill="#e0a526" />
            <circle r="3.5" fill="#0f2a4a" />
          </g>
          <text
            x="350"
            y="312"
            fill="#ffffff"
            font-family="'Public Sans', system-ui, sans-serif"
            font-size="13"
            font-weight="600"
          >
            Barangay Hall
          </text>
        </svg>

        <!-- Fade so text stays legible over the map -->
        <div
          class="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0f2a4a] via-[#0f2a4a]/85 to-transparent"
        ></div>

        <div class="absolute inset-x-0 bottom-0 p-12 xl:p-16">
          <h2
            class="font-display max-w-md text-4xl font-semibold leading-tight tracking-tight text-white"
          >
            Barangay Information System
          </h2>
          <p class="mt-3 max-w-sm text-base leading-relaxed text-white/70">
            Household, resident, and certificate records for every purok, in one place.
          </p>
        </div>
      </aside>
    </main>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, HOME_BY_ROLE } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const keepLoggedIn = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const fieldErrors = reactive<{ username: string; password: string }>({
  username: '',
  password: '',
})

const inputClass =
  'h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-[#0f2a4a] focus:outline-none focus:ring-4 focus:ring-[#0f2a4a]/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-white/30 dark:focus:border-[#e0a526] dark:focus:ring-[#e0a526]/20'
const errorBorder = 'border-[#c8323c] focus:border-[#c8323c] focus:ring-[#c8323c]/15'

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const validate = () => {
  fieldErrors.username = username.value ? '' : 'Enter your username.'
  fieldErrors.password = password.value ? '' : 'Enter your password.'
  return !fieldErrors.username && !fieldErrors.password
}

const handleSubmit = async () => {
  errorMessage.value = ''
  if (!validate()) return

  loading.value = true
  try {
    const user = await auth.login({
      username: username.value,
      password: password.value,
      remember: keepLoggedIn.value,
    })

    // Return to the page they were trying to open (internal paths only).
    // If their role can't open it, the router guard sends them to their own home page.
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const isSafeRedirect = redirect.startsWith('/') && !redirect.startsWith('//')
    await router.push(isSafeRedirect ? redirect : HOME_BY_ROLE[user.role])
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600&family=Public+Sans:wght@400;500;600&display=swap');
</style>

<style scoped>
.font-display {
  font-family: 'Bricolage Grotesque', 'Public Sans', system-ui, sans-serif;
}

:global(body) {
  font-family: 'Public Sans', system-ui, sans-serif;
}

.spinner {
  animation: spin 0.8s linear infinite;
}

/* The map draws itself once on page load */
.draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw 1.6s ease-out forwards;
}

.pin {
  opacity: 0;
  animation: fade-in 0.4s ease-out 1.3s forwards;
}

.pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: pulse 2.4s ease-out 1.6s infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes fade-in {
  to {
    opacity: 1;
  }
}
@keyframes pulse {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(3.2);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .draw,
  .pin {
    animation: none;
    stroke-dashoffset: 0;
    opacity: 1;
  }
  .pulse,
  .spinner {
    animation: none;
  }
}
</style>
