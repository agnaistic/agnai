'use strict'

/**
 * @module EasySpeech
 * @typicalname EasySpeech
 */

/**
 * Cross browser Speech Synthesis with easy API.
 * This project was created, because it's always a struggle to get the synthesis
 * part of `Web Speech API` running on most major browsers.
 *
 * Setup is very straight forward (see example).
 *
 * @example
 * import EasySpeech from 'easy-speech'
 *
 * const example = async () => {
 *   await EasySpeech.init() // required
 *   await EasySpeech.speak({ 'Hello, world' })
 * }
 *
 * @see https://wicg.github.io/speech-api/#tts-section
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
 * @type {Object}
 */
var _excluded = ['text', 'voice', 'pitch', 'rate', 'volume', 'force', 'infiniteResume']
function _typeof(o) {
  '@babel/helpers - typeof'
  return (
    (_typeof =
      'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
        ? function (o) {
            return typeof o
          }
        : function (o) {
            return o &&
              'function' == typeof Symbol &&
              o.constructor === Symbol &&
              o !== Symbol.prototype
              ? 'symbol'
              : typeof o
          }),
    _typeof(o)
  )
}
function _slicedToArray(arr, i) {
  return (
    _arrayWithHoles(arr) ||
    _iterableToArrayLimit(arr, i) ||
    _unsupportedIterableToArray(arr, i) ||
    _nonIterableRest()
  )
}
function _nonIterableRest() {
  throw new TypeError(
    'Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
  )
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return
  if (typeof o === 'string') return _arrayLikeToArray(o, minLen)
  var n = Object.prototype.toString.call(o).slice(8, -1)
  if (n === 'Object' && o.constructor) n = o.constructor.name
  if (n === 'Map' || n === 'Set') return Array.from(o)
  if (n === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
    return _arrayLikeToArray(o, minLen)
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]
  return arr2
}
function _iterableToArrayLimit(r, l) {
  var t = null == r ? null : ('undefined' != typeof Symbol && r[Symbol.iterator]) || r['@@iterator']
  if (null != t) {
    var e,
      n,
      i,
      u,
      a = [],
      f = !0,
      o = !1
    try {
      if (((i = (t = t.call(r)).next), 0 === l)) {
        if (Object(t) !== t) return
        f = !1
      } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0);
    } catch (r) {
      ;(o = !0), (n = r)
    } finally {
      try {
        if (!f && null != t['return'] && ((u = t['return']()), Object(u) !== u)) return
      } finally {
        if (o) throw n
      }
    }
    return a
  }
}
function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr
}
function _objectWithoutProperties(source, excluded) {
  if (source == null) return {}
  var target = _objectWithoutPropertiesLoose(source, excluded)
  var key, i
  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source)
    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i]
      if (excluded.indexOf(key) >= 0) continue
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue
      target[key] = source[key]
    }
  }
  return target
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {}
  var target = {}
  var sourceKeys = Object.keys(source)
  var key, i
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i]
    if (excluded.indexOf(key) >= 0) continue
    target[key] = source[key]
  }
  return target
}
function ownKeys(e, r) {
  var t = Object.keys(e)
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e)
    r &&
      (o = o.filter(function (r) {
        return Object.getOwnPropertyDescriptor(e, r).enumerable
      })),
      t.push.apply(t, o)
  }
  return t
}
function _objectSpread(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {}
    r % 2
      ? ownKeys(Object(t), !0).forEach(function (r) {
          _defineProperty(e, r, t[r])
        })
      : Object.getOwnPropertyDescriptors
      ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t))
      : ownKeys(Object(t)).forEach(function (r) {
          Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r))
        })
  }
  return e
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key)
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  } else {
    obj[key] = value
  }
  return obj
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, 'string')
  return _typeof(key) === 'symbol' ? key : String(key)
}
function _toPrimitive(input, hint) {
  if (_typeof(input) !== 'object' || input === null) return input
  var prim = input[Symbol.toPrimitive]
  if (prim !== undefined) {
    var res = prim.call(input, hint || 'default')
    if (_typeof(res) !== 'object') return res
    throw new TypeError('@@toPrimitive must return a primitive value.')
  }
  return (hint === 'string' ? String : Number)(input)
}
var EasySpeech = {}

/**
 * To support multiple environments (browser, node) we define scope, based
 * on what's available with window as priority, since Browsers are main target.
 * @private
 */
var scope = typeof globalThis === 'undefined' ? window : globalThis

/**
 * @private
 * @type {{
 *  status: String,
    initialized: Boolean,
    speechSynthesis: null|SpeechSynthesis,
    speechSynthesisUtterance: null|SpeechSynthesisUtterance,
    speechSynthesisVoice: null|SpeechSynthesisVoice,
    speechSynthesisEvent: null|SpeechSynthesisEvent,
    speechSynthesisErrorEvent: null|SpeechSynthesisErrorEvent,
    voices: null|Array<SpeechSynthesisVoice>,
    maxLengthExceeded: string,
    defaults: {
      pitch: Number,
      rate: Number,
      volume: Number,
      voice: null|SpeechSynthesisVoice
    },
    handlers: {}
 * }}
 */
var internal = {
  status: 'created',
}
var patches = {}

/*******************************************************************************
 *
 * AVAILABLE WITHOUT INIT
 *
 ******************************************************************************/

/**
 * Enable module-internal debugging by passing your own callback function.
 * Debug will automatically pass through all updates to `status`
 *
 * @example
 * import EasySpeech from 'easy-speech'
 * import Log from '/path/to/my/Log'
 *
 * EasySpeech.debug(arg => Log.debug('EasySpeech:', arg))
 *
 * @param {Function} fn A function, which always receives one argument, that
 *  represents a current debug message
 */
EasySpeech.debug = function (fn) {
  debug = typeof fn === 'function' ? fn : function () {}
}
var debug = function debug() {}

/**
 * Detects all possible occurrences of the main Web Speech API components
 * in the global scope.
 *
 * The returning object will have the following structure (see example).
 *
 * @example
 * EasySpeech.detect()
 *
 * {
 *     speechSynthesis: SpeechSynthesis|undefined,
 *     speechSynthesisUtterance: SpeechSynthesisUtterance|undefined,
 *     speechSynthesisVoice: SpeechSynthesisVoice|undefined,
 *     speechSynthesisEvent: SpeechSynthesisEvent|undefined,
 *     speechSynthesisErrorEvent: SpeechSynthesisErrorEvent|undefined,
 *     onvoiceschanged: Boolean,
 *     onboundary: Boolean,
 *     onend: Boolean,
 *     onerror: Boolean,
 *     onmark: Boolean,
 *     onpause: Boolean,
 *     onresume: Boolean,
 *     onstart: Boolean
 * }
 *
 * @returns {object} An object containing all possible features and their status
 */
EasySpeech.detect = function () {
  return detectFeatures()
}

/** @private **/
var detectFeatures = function detectFeatures() {
  var features = {}
  ;[
    'speechSynthesis',
    'speechSynthesisUtterance',
    'speechSynthesisVoice',
    'speechSynthesisEvent',
    'speechSynthesisErrorEvent',
  ].forEach(function (feature) {
    features[feature] = detect(feature)
  })
  features.onvoiceschanged = hasProperty(features.speechSynthesis, 'onvoiceschanged')
  var hasUtterance = hasProperty(features.speechSynthesisUtterance, 'prototype')
  utteranceEvents.forEach(function (event) {
    var name = 'on'.concat(event)
    features[name] = hasUtterance && hasProperty(features.speechSynthesisUtterance.prototype, name)
  })

  // not published to the outside
  patches.isAndroid = isAndroid()
  patches.isFirefox = isFirefox() || isKaiOS()
  patches.isSafari = isSafari()
  debug('is android: '.concat(!!patches.isAndroid))
  debug('is firefox: '.concat(!!patches.isFirefox))
  debug('is safari: '.concat(!!patches.isSafari))
  return features
}

/** @private **/
var hasProperty = function hasProperty() {
  var target = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {}
  var prop = arguments.length > 1 ? arguments[1] : undefined
  return Object.hasOwnProperty.call(target, prop) || prop in target || !!target[prop]
}

/** @private **/
var getUA = function getUA() {
  return (scope.navigator || {}).userAgent || ''
}

/** @private **/
var isAndroid = function isAndroid() {
  return /android/i.test(getUA())
}

/** @private **/
var isKaiOS = function isKaiOS() {
  return /kaios/i.test(getUA())
}

/** @private **/
var isFirefox = function isFirefox() {
  // InstallTrigger will soon be deprecated
  if (typeof scope.InstallTrigger !== 'undefined') {
    return true
  }
  return /firefox/i.test(getUA())
}

/** @private **/
var isSafari = function isSafari() {
  return typeof scope.GestureEvent !== 'undefined'
}

/**
 * Common prefixes for browsers that tend to implement their custom names for
 * certain parts of their API.
 * @private
 **/
var prefixes = ['webKit', 'moz', 'ms', 'o']

/**
 * Make the first character of a String uppercase
 * @private
 **/
var capital = function capital(s) {
  return ''.concat(s.charAt(0).toUpperCase()).concat(s.slice(1))
}

/**
 * Find a feature in global scope by checking for various combinations and
 * variations of the base-name
 * @param {String} baseName name of the component to look for, must begin with
 *   lowercase char
 * @return {Object|undefined} The component from global scope, if found
 * @private
 **/
var detect = function detect(baseName) {
  var capitalBaseName = capital(baseName)
  var baseNameWithPrefixes = prefixes.map(function (p) {
    return ''.concat(p).concat(capitalBaseName)
  })
  var found = [baseName, capitalBaseName].concat(baseNameWithPrefixes).find(inGlobalScope)
  return scope[found]
}

/**
 * Returns, if a given name exists in global scope
 * @private
 * @param name
 * @return {boolean}
 */
var inGlobalScope = function inGlobalScope(name) {
  return scope[name]
}

/**
 * Returns a shallow copy of the current internal status. Depending of the
 * current state this might return an object with only a single field `status`
 * or a complete Object, including detected features, `defaults`, `handlers`
 * and supported `voices`.
 *
 * @example
 * import EasySpeech from 'easy-speech'
 *
 * // uninitialized
 * EasySpeech.status() // { status: 'created' }
 *
 * // after EasySpeech.init
 * EasySpeech.status()
 *
 * {
 *   status: 'init: complete',
 *   initialized: true,
 *   speechSynthesis: speechSynthesis,
 *   speechSynthesisUtterance: SpeechSynthesisUtterance,
 *   speechSynthesisVoice: SpeechSynthesisVoice,
 *   speechSynthesisEvent: SpeechSynthesisEvent,
 *   speechSynthesisErrorEvent: SpeechSynthesisErrorEvent,
 *   voices: [...],
 *   defaults: {
 *     pitch: 1,
 *     rate: 1,
 *     volume: 1,
 *     voice: null
 *   },
 *   handlers: {}
 * }
 *
 * @return {Object} the internal status
 */
EasySpeech.status = function () {
  return _objectSpread({}, internal)
}

/**
 * Returns a filtered subset of available voices by given
 * parameters. Multiple parameters can be used.
 * @param name {string=} a string that is expected to occur in the voices name; does not need to be the full name
 * @param voiceURI {string=} a string that is expected to occur in the voices voiceURI; does not need to be the full URI
 * @param language {string=} a language code to filter by .lang; short and long-form are accepted
 * @param localService {boolean=} use true/false to include/exclude local/remote voices
 * @return {SpeechSynthesisVoice[]} a list of voices, matching the given rules
 */
EasySpeech.filterVoices = function (_ref) {
  var name = _ref.name,
    language = _ref.language,
    localService = _ref.localService,
    voiceURI = _ref.voiceURI
  var voices = internal.voices || []
  var hasName = typeof name !== 'undefined'
  var hasVoiceURI = typeof voiceURI !== 'undefined'
  var hasLocalService = typeof localService !== 'undefined'
  var hasLang = typeof language !== 'undefined'
  var langCode = hasLang && language.split(/[-_]+/g)[0].toLocaleLowerCase()
  return voices.filter(function (v) {
    if (
      (hasName && v.name.includes(name)) ||
      (hasVoiceURI && v.voiceURI.includes(voiceURI)) ||
      (hasLocalService && v.localService === localService)
    ) {
      return true
    }
    if (hasLang) {
      var compareLang = v.lang && v.lang.toLocaleLowerCase()
      return (
        compareLang &&
        (compareLang === langCode ||
          compareLang.indexOf(''.concat(langCode, '-')) > -1 ||
          compareLang.indexOf(''.concat(langCode, '_')) > -1)
      )
    }
    return false
  })
}

/**
 * Updates the internal status
 * @private
 * @param {String} s the current status to set
 */
var status = function status(s) {
  debug(s)
  internal.status = s
}

/**
 * This is the function you need to run, before being able to speak.
 * It includes:
 * - feature detection
 * - feature assignment (into internal state)
 * - voices loading
 * - state update
 * - inform caller about success
 *
 * It will load voices by a variety of strategies:
 *
 * - detect and that SpeechSynthesis is basically supported, if not -> fail
 * - load voices directly
 * - if not loaded but `onvoiceschanged` is available: use `onvoiceschanged`
 * - if `onvoiceschanged` is not available: fallback to timeout
 * - if `onvoiceschanged` is fired but no voices available: fallback to timeout
 * - timeout reloads voices in a given `interval` until a `maxTimeout` is reached
 * - if voices are loaded until then -> complete
 * - if no voices found -> fail
 *
 * Note: if once initialized you can't re-init (will skip and resolve to
 * `false`) unless you run `EasySpeech.reset()`.
 *
 * @param maxTimeout {number}[5000] the maximum timeout to wait for voices in ms
 * @param interval {number}[250] the interval in ms to check for voices
 * @param quiet {boolean=} prevent rejection on errors, e.g. if no voices
 * @param maxLengthExceeded {string=} defines what to do, if max text length (4096 bytes) is exceeded:
 * - 'error' - throw an Error
 * - 'none' - do nothing; note that some voices may not speak the text at all without any error or warning
 * - 'warn' - default, raises a warning
 * @return {Promise<Boolean>}
 * @fulfil {Boolean} true, if initialized, false, if skipped (because already
 *   initialized)
 * @reject {Error} - The error `message` property will always begin with
 *   `EasySpeech: ` and contain one of the following:
 *
 *   - `browser misses features` - The browser will not be able to use speech
 *      synthesis at all as it misses crucial features
 *   - `browser has no voices (timeout)` - No voice could be loaded with neither
 *      of the given strategies; chances are high the browser does not have
 *      any voices embedded (example: Chromium on *buntu os')
 */

EasySpeech.init = function () {
  var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
    _ref2$maxTimeout = _ref2.maxTimeout,
    maxTimeout = _ref2$maxTimeout === void 0 ? 5000 : _ref2$maxTimeout,
    _ref2$interval = _ref2.interval,
    interval = _ref2$interval === void 0 ? 250 : _ref2$interval,
    quiet = _ref2.quiet,
    maxLengthExceeded = _ref2.maxLengthExceeded
  return new Promise(function (resolve, reject) {
    if (internal.initialized) {
      return resolve(false)
    }
    EasySpeech.reset()
    status('init: start')

    // there may be the case, that the browser needs to load using a timer
    // so we declare it at the top to make sure the interval is always cleared
    // when we exit the Promise via fail / complete
    var timer
    var voicesChangedListener
    var completeCalled = false
    internal.maxLengthExceeded = maxLengthExceeded || 'warn'
    var fail = function fail(errorMessage) {
      status('init: failed ('.concat(errorMessage, ')'))
      clearInterval(timer)
      internal.initialized = false

      // we have the option to fail quiet here
      return quiet ? resolve(false) : reject(new Error('EasySpeech: '.concat(errorMessage)))
    }
    var complete = function complete() {
      // avoid race-conditions between listeners and timeout
      if (completeCalled) {
        return
      }
      status('init: complete')

      // set flags immediately
      completeCalled = true
      internal.initialized = true

      // cleanup events and timer
      clearInterval(timer)
      speechSynthesis.onvoiceschanged = null
      if (voicesChangedListener) {
        speechSynthesis.removeEventListener('voiceschanged', voicesChangedListener)
      }

      // all done
      return resolve(true)
    }

    // before initializing we force-detect all required browser features
    var features = detectFeatures()
    var hasAllFeatures = !!features.speechSynthesis && !!features.speechSynthesisUtterance
    if (!hasAllFeatures) {
      return fail('browser misses features')
    }

    // assign all detected features to our internal definitions
    Object.keys(features).forEach(function (feature) {
      internal[feature] = features[feature]
    })

    // start initializing
    var speechSynthesis = internal.speechSynthesis
    var voicesLoaded = function voicesLoaded() {
      var voices = speechSynthesis.getVoices() || []
      if (voices.length > 0) {
        internal.voices = voices
        status('voices loaded: '.concat(voices.length))

        // if we find a default voice, set it as default
        internal.defaultVoice = voices.find(function (v) {
          return v['default']
        })

        // otherwise let's stick to the first one we can find by locale
        if (!internal.defaultVoice) {
          var language = (scope.navigator || {}).language || ''
          var filtered = EasySpeech.filterVoices({
            language: language,
          })
          if (filtered.length > 0) {
            internal.defaultVoice = filtered[0]
          }
        }

        // otherwise let's use the first element in the array
        if (!internal.defaultVoice) {
          internal.defaultVoice = voices[0]
        }
        return true
      }
      return false
    }
    status('init: voices')

    // best case: detect if voices can be loaded directly
    if (voicesLoaded()) {
      return complete()
    }

    // last possible fallback method: run a timer until max. timeout and reload
    var loadViaTimeout = function loadViaTimeout() {
      status('init: voices (timer)')
      var timeout = 0
      timer = setInterval(function () {
        if (voicesLoaded()) {
          return complete()
        }
        if (timeout > maxTimeout) {
          return fail('browser has no voices (timeout)')
        }
        timeout += interval
      }, interval)
    }

    // detect if voices can be loaded after onveoiceschanged,
    // but only if the browser supports this event
    if (features.onvoiceschanged) {
      status('init: voices (onvoiceschanged)')
      speechSynthesis.onvoiceschanged = function () {
        if (voicesLoaded()) {
          return complete()
        }

        // xxx: some browsers (like chrome on android still have not all
        // voices loaded at this point, whichs is why we need to enter
        // the timeout-based method here.
        return loadViaTimeout()
      }

      // xxx: there is an edge-case where browser provide onvoiceschanged,
      // but they never load the voices, so init would never complete
      // in such case we need to fail after maxTimeout
      setTimeout(function () {
        if (voicesLoaded()) {
          return complete()
        }
        return fail('browser has no voices (timeout)')
      }, maxTimeout)
    } else {
      // this is a very problematic case, since we don't really know, whether
      // this event will fire at all, so we need to setup both a listener AND
      // run the timeout and make sure on of them "wins"
      // affected browsers may be: MacOS Safari
      if (hasProperty(speechSynthesis, 'addEventListener')) {
        status('init: voices (addEventListener)')
        voicesChangedListener = function voicesChangedListener() {
          if (voicesLoaded()) {
            return complete()
          }
        }
        speechSynthesis.addEventListener('voiceschanged', voicesChangedListener)
      }

      // for all browser not supporting onveoiceschanged we start a timer
      // until we reach a certain timeout and try to get the voices
      loadViaTimeout()
    }
  })
}

/**
 * Placed as first line in functions that require `EasySpeech.init` before they
 * can run.
 * @param {boolean=} force set to true to force-skip check
 * @private
 */
var ensureInit = function ensureInit() {
  var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
    force = _ref3.force
  if (!force && !internal.initialized) {
    throw new Error('EasySpeech: not initialized. Run EasySpeech.init() first')
  }
}

/*******************************************************************************
 *
 * AVAILABLE ONLY AFTER INIT
 *
 ******************************************************************************/

/**
 * Returns all available voices.
 *
 * @condition `EasySpeech.init` must have been called and resolved to `true`
 * @return {Array<SpeechSynthesisVoice>}
 */
EasySpeech.voices = function () {
  ensureInit()
  return internal.voices
}

/**
 * Attaches global/default handlers to every utterance instance. The handlers
 * will run in parallel to any additional handlers, attached when calling
 * `EasySpeech.speak`
 *
 * @condition `EasySpeech.init` must have been called and resolved to `true`
 *
 * @param {Object} handlers
 * @param {function=} handlers.boundary - optional, event handler
 * @param {function=} handlers.end - optional, event handler
 * @param {function=} handlers.error - optional, event handler
 * @param {function=} handlers.mark - optional, event handler
 * @param {function=} handlers.pause - optional, event handler
 * @param {function=} handlers.resume - optional, event handler
 * @param {function=} handlers.start - optional, event handler
 *
 * @return {Object} a shallow copy of the Object, containing all global handlers
 */
EasySpeech.on = function (handlers) {
  ensureInit()
  utteranceEvents.forEach(function (name) {
    var handler = handlers[name]
    if (validate.handler(handler)) {
      internal.handlers[name] = handler
    }
  })
  return _objectSpread({}, internal.handlers)
}

/**
 * We use these keys to search for these events in handler objects and defaults
 * @private
 */
var utteranceEvents = ['boundary', 'end', 'error', 'mark', 'pause', 'resume', 'start']

/**
 * Internal validation of passed parameters
 * @private
 */
var validate = {
  isNumber: function isNumber(n) {
    return typeof n === 'number' && !Number.isNaN(n)
  },
  pitch: function pitch(p) {
    return validate.isNumber(p) && p >= 0 && p <= 2
  },
  volume: function volume(v) {
    return validate.isNumber(v) && v >= 0 && v <= 1
  },
  rate: function rate(r) {
    return validate.isNumber(r) && r >= 0.1 && r <= 10
  },
  text: function text(t) {
    return typeof t === 'string'
  },
  handler: function handler(h) {
    return typeof h === 'function'
  },
  // we prefer duck typing here, mostly because there are cases where
  // SpeechSynthesisVoice is not defined on global scope but is supported
  // when using getVoices().
  voice: function voice(v) {
    return v && v.lang && v.name && v.voiceURI
  },
}

/**
 * Sets defaults for utterances. Invalid values will be ignored without error
 * or warning.
 *
 * @see https://wicg.github.io/speech-api/#utterance-attributes
 * @param {object=} options - Optional object containing values to set values
 * @param {object=} options.voice - Optional `SpeechSynthesisVoice` instance or
 *  `SpeechSynthesisVoice`-like Object
 * @param {number=} options.pitch - Optional pitch value >= 0 and <= 2
 * @param {number=} options.rate - Optional rate value >= 0.1 and <= 10
 * @param {number=} options.volume - Optional volume value >= 0 and <= 1
 *
 * @return {object} a shallow copy of the current defaults
 */
EasySpeech.defaults = function (options) {
  ensureInit()
  if (options) {
    internal.defaults = internal.defaults || {}
    ;['voice', 'pitch', 'rate', 'volume'].forEach(function (name) {
      var value = options[name]
      var isValid = validate[name]
      if (isValid(value)) {
        internal.defaults[name] = value
      }
    })
  }
  return _objectSpread({}, internal.defaults)
}

/**
 * Determines the current voice and makes sure, there is always a voice returned
 * @private
 * @param voice
 * @return {*|SpeechSynthesisVoice|{}}
 */
var getCurrentVoice = function getCurrentVoice(voice) {
  var _internal$defaults, _internal$voices
  return (
    voice ||
    ((_internal$defaults = internal.defaults) === null || _internal$defaults === void 0
      ? void 0
      : _internal$defaults.voice) ||
    internal.defaultVoice ||
    ((_internal$voices = internal.voices) === null || _internal$voices === void 0
      ? void 0
      : _internal$voices[0])
  )
}

/**
 * Creates a new `SpeechSynthesisUtterance` instance
 * @private
 * @param text
 */
var createUtterance = function createUtterance(text) {
  var UtteranceClass = internal.speechSynthesisUtterance
  return new UtteranceClass(text)
}

/**
 * Speaks a voice by given parameters, constructs utterance by best possible
 * combinations of parameters and defaults.
 *
 * If the given utterance parameters are missing or invalid, defaults will be
 * used as fallback.
 *
 * @example
 * const voice = EasySpeech.voices()[10] // get a voice you like
 *
 * EasySpeech.speak({
 *   text: 'Hello, world',
 *   voice: voice,
 *   pitch: 1.2,  // a little bit higher
 *   rate: 1.7, // a little bit faster
 *   boundary: event => console.debug('word boundary reached', event.charIndex),
 *   error: e => notify(e)
 * })
 *
 * @param {object} options - required options
 * @param {string} text - required text to speak
 * @param {object=} voice - optional `SpeechSynthesisVoice` instance or
 *   structural similar object (if `SpeechSynthesisUtterance` is not supported)
 * @param {number=} options.pitch - Optional pitch value >= 0 and <= 2
 * @param {number=} options.rate - Optional rate value >= 0.1 and <= 10
 * @param {number=} options.volume - Optional volume value >= 0 and <= 1
 * @param {boolean=} options.force - Optional set to true to force speaking, no matter the internal state
 * @param {boolean=} options.infiniteResume - Optional, force or prevent internal resumeInfinity pattern
 * @param {object=} handlers - optional additional local handlers, can be
 *   directly added as top-level properties of the options
 * @param {function=} handlers.boundary - optional, event handler
 * @param {function=} handlers.end - optional, event handler
 * @param {function=} handlers.error - optional, event handler
 * @param {function=} handlers.mark - optional, event handler
 * @param {function=} handlers.pause - optional, event handler
 * @param {function=} handlers.resume - optional, event handler
 * @param {function=} handlers.start - optional, event handler
 *
 *
 * @return {Promise<SpeechSynthesisEvent|SpeechSynthesisErrorEvent>}
 * @fulfill {SpeechSynthesisEvent} Resolves to the `end` event
 * @reject {SpeechSynthesisEvent} rejects using the `error` event
 */
EasySpeech.speak = function (_ref4) {
  var text = _ref4.text,
    voice = _ref4.voice,
    pitch = _ref4.pitch,
    rate = _ref4.rate,
    volume = _ref4.volume,
    force = _ref4.force,
    infiniteResume = _ref4.infiniteResume,
    handlers = _objectWithoutProperties(_ref4, _excluded)
  ensureInit({
    force: force,
  })
  if (!validate.text(text)) {
    throw new Error('EasySpeech: at least some valid text is required to speak')
  }
  if (new TextEncoder().encode(text).length > 4096) {
    var message =
      'EasySpeech: text exceeds max length of 4096 bytes, which will not work with some voices.'
    switch (internal.maxLengthExceeded) {
      case 'none':
        break
      case 'error':
        throw new Error(message)
      case 'warn':
      default:
        console.warn(message)
    }
  }
  var getValue = function getValue(options) {
    var _internal$defaults2
    var _Object$entries$ = _slicedToArray(Object.entries(options)[0], 2),
      name = _Object$entries$[0],
      value = _Object$entries$[1]
    if (validate[name](value)) {
      return value
    }
    return (_internal$defaults2 = internal.defaults) === null || _internal$defaults2 === void 0
      ? void 0
      : _internal$defaults2[name]
  }
  return new Promise(function (resolve, reject) {
    status('init speak')
    var utterance = createUtterance(text)
    var currentVoice = getCurrentVoice(voice)

    // XXX: if we force-speak, we may not get a current voice!
    // This may occur when the browser won't load voices but
    // provides SpeechSynth and SpeechSynthUtterance.
    // We then might at least try to speak something with defaults
    if (currentVoice) {
      utterance.voice = currentVoice
      utterance.lang = currentVoice.lang
      utterance.voiceURI = currentVoice.voiceURI
    }
    utterance.text = text
    utterance.pitch = getValue({
      pitch: pitch,
    })
    utterance.rate = getValue({
      rate: rate,
    })
    utterance.volume = getValue({
      volume: volume,
    })
    var isMsNatural =
      utterance.voice &&
      utterance.voice.name &&
      utterance.voice.name.toLocaleLowerCase().includes('(natural)')
    debugUtterance(utterance, {
      isMsNatural: isMsNatural,
    })
    utteranceEvents.forEach(function (name) {
      var _internal$handlers
      var fn = handlers[name]
      if (validate.handler(fn)) {
        utterance.addEventListener(name, fn)
      }
      if (
        (_internal$handlers = internal.handlers) !== null &&
        _internal$handlers !== void 0 &&
        _internal$handlers[name]
      ) {
        utterance.addEventListener(name, internal.handlers[name])
      }
    })

    // always attached are start, end and error listeners

    // XXX: chrome won't play longer tts texts in one piece and stops after a few
    // words. We need to add an intervall here in order prevent this. See:
    // https://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts
    //
    // XXX: this apparently works only on chrome desktop, while it breaks chrome
    // mobile (android), so we need to detect chrome desktop
    //
    // XXX: resumeInfinity breaks on firefox macOs so we need to avoid it there
    // as well. Since we don't need it in FF anyway, we can safely skip there
    //
    // XXX: resumeInfinity is also incompatible with older safari ios versions
    // so we skip it on safari, too.
    //
    // XXX: we can force-enable or force-disable infiniteResume via flag now and
    // use the deterministic approach if it's not a boolean value
    utterance.addEventListener('start', function () {
      patches.paused = false
      patches.speaking = true
      var defaultResumeInfinity =
        !isMsNatural && !patches.isFirefox && !patches.isSafari && patches.isAndroid !== true
      var useResumeInfinity =
        typeof infiniteResume === 'boolean' ? infiniteResume : defaultResumeInfinity
      if (useResumeInfinity) {
        resumeInfinity(utterance)
      }
    })
    utterance.addEventListener('end', function (endEvent) {
      status('speak complete')
      patches.paused = false
      patches.speaking = false
      clearTimeout(timeoutResumeInfinity)
      resolve(endEvent)
    })
    utterance.addEventListener('error', function () {
      var errorEvent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {}
      status('speak failed: '.concat(errorEvent.message))
      patches.paused = false
      patches.speaking = false
      clearTimeout(timeoutResumeInfinity)
      reject(errorEvent)
    })

    // make sure we have no mem-leak
    clearTimeout(timeoutResumeInfinity)
    internal.speechSynthesis.cancel()
    setTimeout(function () {
      return internal.speechSynthesis.speak(utterance)
    }, 10)
  })
}

/** @private **/
var debugUtterance = function debugUtterance(_ref5) {
  var voice = _ref5.voice,
    pitch = _ref5.pitch,
    rate = _ref5.rate,
    volume = _ref5.volume
  var _ref6 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
    _ref6$isMsNatural = _ref6.isMsNatural,
    isMsNatural = _ref6$isMsNatural === void 0 ? false : _ref6$isMsNatural
  debug(
    'utterance: voice='
      .concat(voice === null || voice === void 0 ? void 0 : voice.name, ' volume=')
      .concat(volume, ' rate=')
      .concat(rate, ' pitch=')
      .concat(pitch, ' isMsNatural=')
      .concat(isMsNatural)
  )
}

/**
 * Timer variable to clear interval
 * @private
 */
var timeoutResumeInfinity

/**
 * Fixes long texts in some browsers
 * @private
 * @param target
 */
function resumeInfinity(target) {
  // prevent memory-leak in case utterance is deleted, while this is ongoing
  if (!target && timeoutResumeInfinity) {
    debug('force-clear timeout')
    return scope.clearTimeout(timeoutResumeInfinity)
  }

  // only execute on speaking utterances, otherwise paused
  // utterances will get resumed, thus breaking user experience
  // include internal patching, since some systems have problems with
  // pause/resume and updateing the internal state on speechSynthesis
  var _internal$speechSynth = internal.speechSynthesis,
    paused = _internal$speechSynth.paused,
    speaking = _internal$speechSynth.speaking
  var isSpeaking = speaking || patches.speaking
  var isPaused = paused || patches.paused
  debug('resumeInfinity isSpeaking='.concat(isSpeaking, ' isPaused=').concat(isPaused))
  if (isSpeaking && !isPaused) {
    internal.speechSynthesis.pause()
    internal.speechSynthesis.resume()
  }
  timeoutResumeInfinity = scope.setTimeout(function () {
    resumeInfinity(target)
  }, 5000)
}

/**
 * Cancels the current speaking, if any running
 */
EasySpeech.cancel = function () {
  ensureInit()
  status('cancelling')
  internal.speechSynthesis.cancel()
  patches.paused = false
  patches.speaking = false
}

/**
 * Resumes to speak, if any paused
 */
EasySpeech.resume = function () {
  ensureInit()
  status('resuming')
  patches.paused = false
  patches.speaking = true
  internal.speechSynthesis.resume()
}

/**
 * Pauses the current speaking, if any running
 */
EasySpeech.pause = function () {
  ensureInit()
  status('pausing')

  // exec pause on Android causes speech to end but not to fire end-event
  // se we simply do it manually instead of pausing
  if (patches.isAndroid) {
    debug('patch pause on Android with cancel')
    return internal.speechSynthesis.cancel()
  }
  internal.speechSynthesis.pause()
  // in some cases, pause does not update the internal state,
  // so we need to update it manually using an own state
  patches.paused = true
  patches.speaking = false
}

/**
 * Resets the internal state to a default-uninitialized state
 */
EasySpeech.reset = function () {
  Object.assign(internal, {
    status: 'reset',
    initialized: false,
    speechSynthesis: null,
    speechSynthesisUtterance: null,
    speechSynthesisVoice: null,
    speechSynthesisEvent: null,
    speechSynthesisErrorEvent: null,
    voices: null,
    defaultVoice: null,
    defaults: {
      pitch: 1,
      rate: 1,
      volume: 1,
      voice: null,
    },
    handlers: {},
  })
}
module.exports = EasySpeech
