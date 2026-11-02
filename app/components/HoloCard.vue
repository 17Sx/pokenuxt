<script setup lang="ts">
// Vue port of React Bits HoloCard (https://reactbits.dev/components/holo-card)
// Copyright (c) 2026 David Haz, MIT + Commons Clause
import '~/lib/holo-card/holo-card.css'
import { FRAGMENT, VERTEX } from '~/lib/holo-card/shaders'
import type { HoloPreset } from '~/lib/holo-card/types'

const props = withDefaults(
  defineProps<{
    image?: string
    backImage?: string
    alt?: string
    preset?: HoloPreset
    intensity?: number
    scale?: number
    edgeSparkle?: number
    frame?: number
    glare?: number
    foilColor?: string
    width?: number
    radius?: number
    tiltMax?: number
    hoverScale?: number
    idle?: boolean
    shadow?: boolean
  }>(),
  {
    image: undefined,
    backImage: undefined,
    alt: '',
    preset: 'bursts',
    intensity: 0.85,
    scale: 1,
    edgeSparkle: 0.8,
    frame: 4,
    glare: 0.5,
    foilColor: '#e2e6ec',
    width: 320,
    radius: 14,
    tiltMax: 14,
    hoverScale: 1.04,
    idle: true,
    shadow: true,
  },
)

const PRESETS: HoloPreset[] = [
  'bursts',
  'stars',
  'shards',
  'cosmos',
  'rainbow',
  'swirl',
  'glitter',
  'gold',
]
const PERSPECTIVE = 1100
const CARD_RATIO = 63 / 88
const UNIFORMS = [
  'uArt',
  'uSize',
  'uAspect',
  'uTilt',
  'uLight',
  'uDistance',
  'uPreset',
  'uIntensity',
  'uScale',
  'uEdge',
  'uFrame',
  'uRadius',
  'uGlare',
  'uFoil',
  'uReady',
] as const

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const parseColor = (value: string): number[] => {
  const fallback = [0.78, 0.8, 0.84]
  if (typeof document === 'undefined') return fallback
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return fallback
  ctx.fillStyle = '#000000'
  ctx.fillStyle = value
  const resolved = ctx.fillStyle
  if (!resolved.startsWith('#') || resolved.length !== 7) return fallback
  return [1, 3, 5].map((i) =>
    Math.pow(parseInt(resolved.slice(i, i + 2), 16) / 255, 2.2),
  )
}

const compile = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  gl.deleteShader(shader)
  return null
}

const spring = (
  value: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): [number, number] => {
  const next =
    velocity + ((target - value) * stiffness - velocity * damping) * dt
  return [value + next * dt, next]
}

const rootRef = ref<HTMLDivElement>()
const rotorRef = ref<HTMLDivElement>()
const shadowRef = ref<HTMLSpanElement>()
const canvasRef = ref<HTMLCanvasElement>()
const ratio = ref(CARD_RATIO)
const ready = ref(false)
const flipped = ref(false)
const flippable = computed(() => Boolean(props.backImage))

const settings = computed(() => ({
  preset: Math.max(0, PRESETS.indexOf(props.preset)),
  intensity: clamp(props.intensity, 0, 1),
  scale: clamp(props.scale, 0.25, 4),
  edgeSparkle: clamp(props.edgeSparkle, 0, 1),
  frame: clamp(props.frame, 0, 20) / 100,
  glare: clamp(props.glare, 0, 1),
  foil: parseColor(props.foilColor),
  radius: Math.max(0, props.radius),
  tiltMax: clamp(props.tiltMax, 0, 45),
  hoverScale: clamp(props.hoverScale, 0.8, 1.3),
  idle: props.idle,
}))

let pointer = { x: 0.5, y: 0.5, inside: false }
let wake: (() => void) | null = null
let load: ((src?: string) => void) | null = null
let cleanup: (() => void) | null = null

watch([settings, flipped], () => wake?.())
watch(
  () => props.image,
  (src) => load?.(src),
)

onMounted(() => {
  const root = rootRef.value
  const rotor = rotorRef.value
  const canvas = canvasRef.value
  if (!root || !rotor || !canvas) return

  const reduce =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
  })
  let program: WebGLProgram | null = null
  let texture: WebGLTexture | null = null
  let buffer: WebGLBuffer | null = null
  const uniforms: Partial<
    Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>
  > = {}
  let textureReady = false

  if (gl) {
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
    if (vertex && fragment) {
      program = gl.createProgram()
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.bindAttribLocation(program, 0, 'position')
      gl.linkProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program)
        program = null
      }
    }
    if (program) {
      buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      )
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 0]),
      )
      for (const name of UNIFORMS)
        uniforms[name] = gl.getUniformLocation(program, name)
    }
  }

  const state = {
    tiltX: 0,
    tiltY: 0,
    tiltVX: 0,
    tiltVY: 0,
    lightX: 0.36,
    lightY: 0.26,
    lightVX: 0,
    lightVY: 0,
    lift: 1,
    liftV: 0,
    turn: 0,
    turnV: 0,
    clock: Math.random() * 40,
  }
  let raf = 0
  let last = 0
  let visible = true
  let alive = true
  let calm = 0

  const draw = () => {
    if (!gl || !program) return
    const s = settings.value
    const w = canvas.width
    const h = canvas.height
    if (!w || !h) return
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(uniforms.uArt!, 0)
    gl.uniform2f(uniforms.uSize!, w, h)
    gl.uniform1f(uniforms.uAspect!, h / w)
    gl.uniform2f(
      uniforms.uTilt!,
      (state.tiltX * Math.PI) / 180,
      ((state.tiltY + state.turn) * Math.PI) / 180,
    )
    gl.uniform2f(uniforms.uLight!, state.lightX, state.lightY)
    gl.uniform1f(
      uniforms.uDistance!,
      PERSPECTIVE / Math.max(1, canvas.clientWidth),
    )
    gl.uniform1i(uniforms.uPreset!, s.preset)
    gl.uniform1f(uniforms.uIntensity!, s.intensity)
    gl.uniform1f(uniforms.uScale!, s.scale)
    gl.uniform1f(uniforms.uEdge!, s.edgeSparkle)
    gl.uniform1f(uniforms.uFrame!, s.frame)
    gl.uniform1f(uniforms.uRadius!, s.radius / Math.max(1, canvas.clientWidth))
    gl.uniform1f(uniforms.uGlare!, s.glare)
    gl.uniform3f(uniforms.uFoil!, s.foil[0]!, s.foil[1]!, s.foil[2]!)
    gl.uniform1f(uniforms.uReady!, textureReady ? 1 : 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const tick = (now: number) => {
    raf = 0
    if (!alive) return
    const dt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000))
    last = now
    const s = settings.value
    const flip = flippable.value && flipped.value
    let targetX = 0
    let targetY = 0
    let lightX = 0.36
    let lightY = 0.26
    let lift = 1
    const drifting = s.idle && !reduce && !pointer.inside
    if (pointer.inside && !reduce) {
      targetX = (0.5 - pointer.y) * 2 * s.tiltMax
      targetY = (pointer.x - 0.5) * 2 * s.tiltMax
      lightX = pointer.x
      lightY = pointer.y
      lift = s.hoverScale
    } else if (drifting) {
      state.clock += dt
      const t = state.clock
      targetX = Math.sin(t * 0.7) * s.tiltMax * 0.28
      targetY = Math.sin(t * 0.53 + 1.2) * s.tiltMax * 0.4
      lightX = 0.5 + Math.sin(t * 0.41) * 0.42
      lightY = 0.38 + Math.sin(t * 0.33 + 0.6) * 0.3
    }
    const steps = Math.ceil(dt / (1 / 240))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      ;[state.tiltX, state.tiltVX] = spring(
        state.tiltX,
        state.tiltVX,
        targetX,
        150,
        16,
        h,
      )
      ;[state.tiltY, state.tiltVY] = spring(
        state.tiltY,
        state.tiltVY,
        targetY,
        150,
        16,
        h,
      )
      ;[state.lightX, state.lightVX] = spring(
        state.lightX,
        state.lightVX,
        lightX,
        220,
        30,
        h,
      )
      ;[state.lightY, state.lightVY] = spring(
        state.lightY,
        state.lightVY,
        lightY,
        220,
        30,
        h,
      )
      ;[state.lift, state.liftV] = spring(
        state.lift,
        state.liftV,
        lift,
        320,
        30,
        h,
      )
      ;[state.turn, state.turnV] = reduce
        ? [flip ? 180 : 0, 0]
        : spring(state.turn, state.turnV, flip ? 180 : 0, 170, 20, h)
    }
    rotor.style.transform = `perspective(${PERSPECTIVE}px) scale(${state.lift}) rotateX(${state.tiltX}deg) rotateY(${state.tiltY + state.turn}deg)`
    if (shadowRef.value) {
      shadowRef.value.style.transform = `translate(${-state.tiltY * 0.7}px, ${state.tiltX * 0.7}px) scale(${0.9 + (state.lift - 1) * 1.5})`
    }
    if (Math.cos(((state.tiltY + state.turn) * Math.PI) / 180) > -0.05) draw()
    const motion =
      Math.abs(state.tiltVX) +
      Math.abs(state.tiltVY) +
      Math.abs(state.liftV) * 40 +
      Math.abs(state.turnV) +
      (Math.abs(state.lightVX) + Math.abs(state.lightVY)) * 60 +
      Math.abs(state.tiltX - targetX) +
      Math.abs(state.tiltY - targetY)
    calm = motion > 0.02 ? 0 : calm + dt
    if (!visible || (!drifting && !pointer.inside && calm > 0.3)) return
    raf = requestAnimationFrame(tick)
  }

  wake = () => {
    if (raf || !alive) return
    calm = 0
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    draw()
    wake?.()
  }

  load = (src?: string) => {
    textureReady = false
    ready.value = false
    if (!src) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      if (!alive) return
      if (img.naturalWidth && img.naturalHeight)
        ratio.value = img.naturalWidth / img.naturalHeight
      if (!gl || !program) return
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
        gl.generateMipmap(gl.TEXTURE_2D)
        textureReady = true
        ready.value = true
        draw()
        wake?.()
      } catch {
        textureReady = false
      }
    }
    img.src = src
  }
  load(props.image)

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  const visibility = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting)
    if (visible) wake?.()
  })
  visibility.observe(root)
  resize()

  cleanup = () => {
    alive = false
    cancelAnimationFrame(raf)
    wake = null
    load = null
    resizeObserver.disconnect()
    visibility.disconnect()
    if (gl) {
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }
})

onBeforeUnmount(() => cleanup?.())

const track = (e: PointerEvent) => {
  if (e.pointerType === 'touch' && e.type === 'pointermove' && !e.buttons)
    return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  pointer = {
    x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    inside: true,
  }
  wake?.()
}

const leave = () => {
  pointer = { ...pointer, inside: false }
  wake?.()
}

const toggle = () => {
  if (flippable.value) flipped.value = !flipped.value
}

const onKeydown = (e: KeyboardEvent) => {
  if (!flippable.value || (e.key !== 'Enter' && e.key !== ' ')) return
  e.preventDefault()
  if (!e.repeat) toggle()
}
</script>

<template>
  <div
    ref="rootRef"
    class="holo-card"
    :role="flippable ? 'button' : 'img'"
    :tabindex="flippable ? 0 : undefined"
    :aria-label="alt || undefined"
    :aria-pressed="flippable ? flipped : undefined"
    :data-ready="ready ? '' : undefined"
    :data-flippable="flippable ? '' : undefined"
    :style="{
      '--hc-w': `${width}px`,
      '--hc-ratio': ratio,
      '--hc-radius': `${radius}px`,
    }"
    @pointerenter="track"
    @pointermove="track"
    @pointerdown="track"
    @pointerleave="leave"
    @pointercancel="leave"
    @click="toggle"
    @keydown="onKeydown"
  >
    <span
      v-if="shadow"
      ref="shadowRef"
      class="holo-card__shadow"
      aria-hidden="true"
    />
    <div ref="rotorRef" class="holo-card__rotor">
      <div class="holo-card__face holo-card__face--front">
        <img v-if="image" :src="image" alt="" draggable="false" />
        <canvas ref="canvasRef" />
      </div>
      <div v-if="flippable" class="holo-card__face holo-card__face--back">
        <img :src="backImage" alt="" draggable="false" />
      </div>
    </div>
  </div>
</template>
