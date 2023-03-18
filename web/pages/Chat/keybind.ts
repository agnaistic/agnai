export function handleSwipes(onLeft: () => void, onRight: () => void) {
  const handler = (e: KeyboardEvent) => {
    // We want to avoid interfering with
    if (!e.altKey || !e.ctrlKey) return

    if (e.key === 'ArrowLeft') {
      onLeft()
    }

    if (e.key === 'ArrowRight') {
      onRight()
    }
  }
}
