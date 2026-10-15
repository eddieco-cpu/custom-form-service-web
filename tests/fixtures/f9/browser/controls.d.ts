import type { UserDto } from '../../../../app/domain/api/user'
declare global {
  interface Window { f9Harness: { login: (user: UserDto) => void; verify: () => Promise<boolean>; profile: (user: UserDto) => void; push: (path: string) => Promise<unknown> } }
}
export {}
