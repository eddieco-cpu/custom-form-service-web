import { test, expect } from '@playwright/test'
import { randomBytes } from 'node:crypto'
for (const kind of ['single-label', 'quoted', 'unicode', 'invariant-casing'] as const) {
  test(`F3-LIVE-EMAIL ${kind} register/login through real API`, async ({ page }) => {
    const id = `f3-${Date.now()}-${randomBytes(3).toString('hex')}`
    const email = kind === 'single-label' ? `${id}@localhost` : kind === 'quoted' ? `"${id} a"@example.test` : kind === 'unicode' ? `測試${id}@example.test` : `İ${id}@EXAMPLE.TEST`
    const password = randomBytes(20).toString('hex')
    await page.goto('/login?redirect=%2Fprofile')
    await page.getByRole('tab', { name: '註冊', exact: true }).click()
    await page.getByRole('textbox', { name: '姓名' }).fill(`Email ${kind}`)
    await page.getByRole('textbox', { name: 'Email' }).fill(email)
    await page.getByLabel('密碼', { exact: true }).fill(password)
    const registering = page.waitForResponse(r => r.url().endsWith('/auth/register'))
    await page.getByRole('button', { name: '註冊', exact: true }).click()
    const response = await registering
    expect(response.status()).toBe(201)
    const returned = await response.json() as { email: string }
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(returned.email)
    await page.getByLabel('密碼', { exact: true }).fill(password)
    await page.getByRole('button', { name: '登入', exact: true }).click()
    await expect(page).toHaveURL('http://localhost:3000/profile')
    await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(`Email ${kind}`)
    await page.getByRole('button', { name: '使用者選單' }).click()
    await page.getByRole('button', { name: '登出', exact: true }).click()
    await expect(page).toHaveURL('http://localhost:3000/login')
  })
}
test('F3-LIVE-ERROR invalid email reaches server details; incorrect credentials remain on login', async ({ page }) => {
  await page.goto('/login?redirect=%2Fprofile')
  await page.getByRole('tab', { name: '註冊', exact: true }).click()
  await page.getByRole('textbox', { name: '姓名' }).fill('F3 invalid email')
  await page.getByRole('textbox', { name: 'Email' }).fill('a@@example.test')
  await page.getByLabel('密碼', { exact: true }).fill(randomBytes(20).toString('hex'))
  const registering = page.waitForResponse(r => r.url().endsWith('/auth/register'))
  await page.getByRole('button', { name: '註冊', exact: true }).click()
  const response = await registering
  expect(response.status()).toBe(400)
  const result = await response.json() as { error: { code: string; details: { path: string }[] } }
  expect(result.error.code).toBe('VALIDATION_ERROR'); expect(result.error.details.some(d => d.path === 'email')).toBe(true)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click()
  await expect(page.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true')
  await page.getByRole('tab', { name: '登入', exact: true }).click()
  const loggingIn = page.waitForResponse(r => r.url().endsWith('/auth/login'))
  await page.getByRole('button', { name: '登入', exact: true }).click()
  expect((await loggingIn).status()).toBe(401)
  await expect(page.getByRole('dialog')).toContainText('Email 或密碼不正確')
  expect(new URL(page.url()).pathname).toBe('/login')
})
