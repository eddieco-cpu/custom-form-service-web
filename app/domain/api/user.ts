export interface UserDto { readonly id: string; readonly email: string; readonly displayName: string; readonly avatarUrl: string | null }
export interface RegisterRequest { readonly email: string; readonly password: string; readonly displayName: string }
export interface LoginRequest { readonly email: string; readonly password: string }
export interface ProfileRequest { readonly displayName: string }
