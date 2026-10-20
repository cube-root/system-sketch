/** Guard metadata mutations against an editor open in another browser tab. */
export async function withDiagramLock<T>(id: string, action: () => Promise<T>): Promise<T> {
  if (!navigator.locks) return action()
  return navigator.locks.request(`systemsketch:${id}`, { ifAvailable: true }, async (lock) => {
    if (!lock)
      throw new Error('This diagram is open for editing in another tab. Close its editor first.')
    return action()
  })
}
