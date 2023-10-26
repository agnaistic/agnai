let audioContext = new AudioContext()
let clickSoundBuffer = new AudioBuffer({ length: 1, sampleRate: 22000 })

export async function loadSounds() {
  const response = await window.fetch(
    'https://assets.mixkit.co/active_storage/sfx/1133/1133-preview.mp3'
  )

  const data = await response.arrayBuffer()

  const bufferPromise = async () => {
    return new Promise<AudioBuffer>((resolve, reject) => {
      audioContext.decodeAudioData(
        data,
        (buffer) => resolve(buffer),
        (err) => reject(err)
      )
    })
  }
  clickSoundBuffer = await bufferPromise()
}

export function playClick() {
  const clickSound = audioContext.createBufferSource()
  clickSound.buffer = clickSoundBuffer
  clickSound.connect(audioContext.destination)

  clickSound?.start()
}
