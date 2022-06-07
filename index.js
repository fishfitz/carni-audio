module.exports = () => {
  const Pizzicato = require('Pizzicato')
  const audioFiles = (ctx => ctx.keys().reduce((acc, file, ...pouet) => {
    return { ...acc, [file.replace('./', '')]: ctx.keys().map(ctx)[0] }
  }, {}))(require.context('~root/game/resources/audio/', true))
  const audioConfig = Object.fromEntries(Object.entries(require('~root/game/audio'))?.map(([key, value]) => {
    return [key, [audioFiles[value[0]] || value[0], value[1]]]
  }))
  console.log(audioFiles, audioConfig)

  const cache = {}

  const loadSound = (source) => {
    return new Promise((resolve) => {
      const sound = new Pizzicato.Sound(source, () => {
        resolve(sound)
      })
    })
  }

  const applyFilters = (sound, filters) => {
    if (!Object.keys(filters).length) sound.play()

    const soundCopy = sound.clone()
    if (filters.volume) soundCopy.volume = filters.volume
    if (filters.frequency) soundCopy.frequency = filters.frequency
    if (filters.delay) soundCopy.addEffect(new Pizzicato.Effects.Delay(filters.delay))
    if (filters.distortion) soundCopy.addEffect(new Pizzicato.Effects.Distortion(filters.distortion))
    if (filters.pan) soundCopy.addEffect(new Pizzicato.Effects.StereoPanner({ pan: filters }))
    if (filters.reverb) soundCopy.addEffect(new Pizzicato.Effects.Reverb(filters.reverb))
    return soundCopy
  }

  const play = async (key, filters = {}) => {
    const { wait = 0, start = 0 } = filters
    if (cache[key]) applyFilters(cache[key], filters).play(wait, start)
    else {
      const source = audioConfig[key]?.[0] || audioFiles[key]
      if (!source) return console.error(`Error: impossible to load audio key ${key}`)
      const builtinFilters = (audioConfig[key] && audioConfig[key][1]) ? audioConfig[key] : {}
      cache[key] = applyFilters(await loadSound(source), builtinFilters)
      applyFilters(cache[key], filters).play(wait, start)
    }
  }

  const eventsMap = new WeakMap()

  const unbind = (el, { arg }) => {
    if (eventsMap.get(el)?.[arg]) el.removeEventListener(arg, eventsMap.get(el)[arg])
    if (eventsMap.get(el)?.[arg]) delete eventsMap.get(el)[arg]
  }

  const bind = (el, { value, arg }) => {
    unbind(el, { arg })
    if (!eventsMap.get(el)) eventsMap.set(el, {})

    eventsMap.get(el)[arg] = () => {
      let sound, filters
      if (Array.isArray(value)) [sound, filters] = value
      else sound = value
      play(sound, filters)
    }
    el.addEventListener(arg, eventsMap.get(el)[arg])
  }

  return {
    functions: {
      AUDIO_PLAY: play,
      AUDIO_PAUSE (key) {
        if (cache[key]) cache[key].pause()
      },
      AUDIO_STOP (key) {
        if (cache[key]) cache[key].stop()
      }
    },
    setup (app) {
      app.directive('audio', bind)
    }
  }
}
