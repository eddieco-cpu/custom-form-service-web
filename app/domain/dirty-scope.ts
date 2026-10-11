export interface DiscardPermit { readonly scope: symbol; readonly revision: unknown; readonly actionId: string }
export class DirtyScope {
  private readonly identity = Symbol('dirty-scope')
  private dirty = false
  private revision: unknown
  private permit?: DiscardPermit
  private navigation?: { readonly transitionId: string; readonly permit: DiscardPermit }
  update(dirty: boolean, revision: unknown): void {
    if (!Object.is(revision, this.revision) || !dirty) this.clear()
    this.dirty = dirty; this.revision = revision
  }
  authorize(actionId: string, confirm: () => boolean): DiscardPermit | undefined {
    this.clear()
    if (this.dirty && !confirm()) return undefined
    this.permit = Object.freeze({ scope: this.identity, revision: this.revision, actionId })
    return this.permit
  }
  valid(permit: DiscardPermit): boolean { return this.permit === permit && permit.scope === this.identity && Object.is(permit.revision, this.revision) }
  bindNavigation(permit: DiscardPermit, transitionId: string): boolean {
    if (!this.valid(permit)) return false
    this.navigation = { transitionId, permit }; return true
  }
  allowNavigation(transitionId: string, confirm: () => boolean): boolean {
    if (this.navigation?.transitionId === transitionId && this.valid(this.navigation.permit)) return true
    const permit = this.authorize(`navigation:${transitionId}`, confirm)
    return !!permit && this.bindNavigation(permit, transitionId)
  }
  clear(): void { this.permit = undefined; this.navigation = undefined }
}
