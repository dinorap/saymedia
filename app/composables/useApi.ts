/**
 * Wrapper gọi API: xử lý 401 (redirect login), 4xx/5xx (toast), giúp code gọn và đồng nhất.
 */
export function useApi() {
  const { show: showToast } = useToast()

  async function request<T = unknown>(
    url: string,
    options?: Parameters<typeof $fetch>[1]
  ): Promise<T> {
    try {
      return await $fetch<T>(url, options)
    } catch (e: any) {
      const status = e?.statusCode ?? e?.response?.status
      const message = e?.data?.statusMessage ?? e?.data?.message ?? e?.message

      if (status === 401) {
        showToast(
          message || "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.",
          "info"
        )
        if (process.client) {
          const path = useRoute().fullPath
          await navigateTo("/login?next=" + encodeURIComponent(path))
        }
        throw e
      }

      if (status && status >= 400) {
        const msg =
          message ||
          (status === 429
            ? "Thao tác quá nhanh, vui lòng thử lại sau."
            : "Có lỗi xảy ra. Vui lòng thử lại.")
        showToast(msg, "error")
      }

      throw e
    }
  }

  return { request }
}
