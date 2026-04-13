import { createAuthClient } from "better-auth/client"

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export const authClient = createAuthClient({
  baseURL: BASE,
  fetchOptions: {
    credentials: "include",
  },
})

export async function apiSignIn(email: string, password: string) {
  return authClient.signIn.email({
    email,
    password,
  })
}

export async function apiSignOut() {
  return authClient.signOut()
}

export async function apiGetSession() {
  return authClient.getSession()
}