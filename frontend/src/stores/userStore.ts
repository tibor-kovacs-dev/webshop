import axios from 'axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore, type User } from './authStore'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isLoading = ref<boolean>(false)
  const isUpdating = ref<boolean>(false)
  const error = ref<string | null>(null)
  const updateSuccess = ref<string | null>(null)

  const getUserData = async (): Promise<void> => {
    const authStore = useAuthStore()

    isLoading.value = true
    error.value = null

    try {
      if (!authStore.isInitialized) {
        await authStore.checkAuth()
      }

      if (!authStore.isAuthenticated || !authStore.user) {
        user.value = null
        error.value = 'The user is not signed in'
        return
      }

      user.value = authStore.user
    } catch (err: any) {
      user.value = null
      error.value =
        err.response?.data?.message ||
        'Failed to load profile details'
    } finally {
      isLoading.value = false
    }
  }

  const updateUserData = async (
    updatedData: Partial<User>,
  ): Promise<boolean> => {
    const authStore = useAuthStore()

    if (!authStore.isAuthenticated || !authStore.user) {
      error.value = 'The user must be signed in to update the profile'
      return false
    }

    isUpdating.value = true
    error.value = null
    updateSuccess.value = null

    try {
      const response = await axios.patch(
        '/api/users/profile',
        updatedData,
      )

      const updatedUser: User = response.data.user
        ? response.data.user
        : {
            ...authStore.user,
            ...updatedData,
          }

      authStore.user = updatedUser
      user.value = updatedUser

      updateSuccess.value =
        response.data.message ||
        'Profile details updated successfully!'

      return true
    } catch (err: any) {
      if (err.response?.status === 401) {
        user.value = null
        await authStore.logout()
      } else if (err.response?.status === 422) {
        error.value = 'Invalid data. Please check the form.'
      } else {
        error.value =
          err.response?.data?.message ||
          'An unknown error occurred while saving'
      }

      return false
    } finally {
      isUpdating.value = false
    }
  }

  const syncUser = (userData: User | null): void => {
    user.value = userData
  }

  return {
    user,
    isLoading,
    isUpdating,
    error,
    updateSuccess,
    getUserData,
    updateUserData,
    syncUser,
  }
})