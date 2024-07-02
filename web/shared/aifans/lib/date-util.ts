export const formatAMPM = (date: Date): string => {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'pm' : 'am'
  const formattedHours = hours % 12 || 12 // Convert 0 to 12 for 12 AM
  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes

  return `${formattedHours}:${formattedMinutes}${ampm}`
}
