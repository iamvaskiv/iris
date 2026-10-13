<script lang="ts" module>
	/** Live-tunable look of the spiral eye (see /dev/orb). Defaults are the current design. */
	export type EyeTune = {
		/** Idle animation speed. */
		tempo: number;
		/** How far the point wanders on its own. */
		wander: number;
		/** How strongly it looks towards the pointer. */
		gaze: number;
		/** Furthest the point may go from the centre (fraction of the radius). */
		maxDistance: number;
		/** Pointer distance (px) at which the gaze is at full strength. */
		gazeReach: number;
		/** How quickly the gaze follows the pointer. */
		gazeEase: number;
		/** Seconds it keeps following the pointer after an interaction, before losing interest. */
		attention: number;
		/** Strength of the spiral arms. */
		curl: number;
		/** Number of spiral arms. */
		arms: number;
		/** How tightly the arms wind. */
		twist: number;
		/** How fast the arms rotate. */
		spin: number;
		/** How fast colour flows outward from the point. */
		flow: number;
		/** Brightness of the point. */
		core: number;
		/** Size of the point (bigger = larger, softer). */
		coreSize: number;
		/** Glow around the point. */
		halo: number;
		/** Colour saturation. */
		saturation: number;
		/** Edge softness. */
		edge: number;
		/** Edge wobble at idle. */
		wobble: number;
	};
	export const EYE_DEFAULTS: EyeTune = {
		tempo: 0.26,
		wander: 0.15,
		gaze: 0.28,
		maxDistance: 0.25,
		gazeReach: 160,
		gazeEase: 2.2,
		attention: 10,
		curl: 0.65,
		arms: 2,
		twist: 2.6,
		spin: 1,
		flow: 1.4,
		core: 0.71,
		coreSize: 1,
		halo: 0.22,
		saturation: 1.12,
		edge: 0.2,
		wobble: 0
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import type { OrbState } from './Orb.svelte';

	/**
	 * Spiral eye orb (WebGL). A bright focal point that wanders near the centre and looks towards the mouse pointer;
	 * colour waves propagate outward from it — white-gold → orange → pink → purple → deep red — curling into spiral
	 * arms, inside a fuzzy, breathing body. Drawn on a canvas a bit larger than `size` so the glow can spill out.
	 * State eases `energy` (idle 0 → thinking 1); `pulse` changes kick a flash and a ripple.
	 * Colours come from the design system's --brand-1..4 tokens.
	 */
	let {
		size,
		state = 'idle',
		pulse,
		follow = true,
		tap,
		tune = EYE_DEFAULTS,
		onfail
	}: {
		size: number;
		state?: OrbState;
		pulse?: unknown;
		/** The focal point looks towards the mouse pointer. */
		follow?: boolean;
		/** Change this value (e.g. a click counter) to make the eye flinch: the bright point squeezes shut and reopens. */
		tap?: unknown;
		/** Look of the eye; read every frame, so changes apply live. */
		tune?: EyeTune;
		/** Called when WebGL isn't available, so the parent can fall back to the CSS orb. */
		onfail?: () => void;
	} = $props();

	const SCALE = 1.5; // canvas size relative to the orb, room for the glow
	let canvas: HTMLCanvasElement;
	let pop = 0;
	let firstPulse = true;

	// Flinch on tap: blink goes 0 → 1 (point hidden) quickly, holds, then eases back open.
	let tappedAt = -Infinity;
	let firstTap = true;
	$effect(() => {
		void tap;
		if (firstTap) return void (firstTap = false);
		tappedAt = performance.now();
	});
	const smooth = (x: number) => x * x * (3 - 2 * x);
	function blinkAt(now: number) {
		const t = (now - tappedAt) / 1000;
		if (t < 0.11) return smooth(t / 0.11); // squeeze shut
		if (t < 0.35) return 1; // hold
		if (t < 0.9) return 1 - smooth((t - 0.35) / 0.55); // ease back open
		return 0;
	}
	$effect(() => {
		void pulse;
		if (firstPulse) return void (firstPulse = false);
		pop = 1;
	});

	const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

	const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_energy, u_pop, u_scale;
// Animation phases, advanced each frame at the current speed (never time × speed, which jumps when speed changes):
// (edge wobble, breathing, wander/spiral, pulse)
uniform vec4 u_phase;
uniform vec2 u_gaze;    // where it's looking (-1..1, orb space)
uniform float u_ripple; // raw pop progress 1 → 0, for the ripple ring
uniform float u_blink;  // 1 = the bright point squeezed shut (on tap)
// Tuning (EyeTune): motion (tempo, wander, gaze, maxDistance), spiral (curl, arms, twist, spin),
// light (core, coreSize, halo, saturation), body (flow, edge, wobble, liveliness)
uniform vec4 u_motion, u_spiral, u_light, u_body;
uniform vec3 c1, c2, c3, c4;

float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
	vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
	           mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }

void main() {
	// uv: orb radius = 1 at its nominal size; the canvas is u_scale times larger.
	vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / (0.5 * u_res.y) * u_scale;
	float r = length(uv);

	// Breathing + pop + a liquid wobble of the edge that grows while thinking.
	float t = u_phase.x;
	float ang = atan(uv.y, uv.x);
	float wobble = (fbm(vec3(cos(ang), sin(ang), t * 0.8) * 1.6) - 0.5) * (u_body.z + 0.22 * u_energy);
	float radius = 1.0 + 0.03 * sin(u_phase.y) + 0.14 * u_pop + wobble;

	// The focal point wanders near the centre; looking at something pulls it that way.
	float tt = u_phase.z;
	// u_body.w: liveliness, 0.35 at rest → 1 when interested or thinking, so at rest the point stays near the centre.
	vec2 wander = vec2(sin(tt * 0.7) + 0.4 * sin(tt * 1.9), cos(tt * 0.5) + 0.3 * sin(tt * 1.3)) * u_motion.y * u_body.w;
	vec2 P = wander * (1.0 - 0.4 * length(u_gaze)) + u_gaze * u_motion.z;
	P *= min(1.0, u_motion.w / max(length(P), 0.001)); // stay near the centre
	vec2 d = uv / radius - P;
	float dr = length(d);
	float da = atan(d.y, d.x);

	// Waves move outward from the point, curling into spiral arms. Low frequency and amplitude, so rings blend.
	float curl = u_spiral.x * sin(da * floor(u_spiral.y + 0.5) + dr * u_spiral.z - tt * u_spiral.w);
	float wave = dr * 2.6 - tt * u_body.x + 0.35 * fbm(vec3(d, tt * 0.4)) + curl;
	// A blink pushes the colours inward, so the white-gold centre gives way to orange and pink.
	float k = clamp(dr * 0.85 + 0.06 * sin(wave * 3.14159) + 0.28 * u_blink, 0.0, 1.35);

	// Wide, overlapping colour stops for soft transitions.
	vec3 col = mix(mix(c3, vec3(1.0), 0.4), c3, smoothstep(0.0, 0.3, k));
	col = mix(col, c2, smoothstep(0.1, 0.62, k));
	col = mix(col, c4, smoothstep(0.38, 0.98, k));
	col = mix(col, c1 * 0.95, smoothstep(0.8, 1.35, k));

	// The point itself: a soft bright core and halo, pulsing (faster while thinking).
	float beat = 0.5 + 0.5 * sin(u_phase.w);
	// On a blink the core shrinks to nothing and fades; the halo dims.
	float coreK = 26.0 / max(u_light.y * u_light.y, 0.05);
	col += mix(c3, vec3(1.0), 0.6) * exp(-dr * dr * coreK * (1.0 + 6.0 * u_blink)) * (u_light.x + 0.25 * beat) * (1.0 - u_blink);
	col += c3 * exp(-dr * dr * 5.0) * (u_light.z + 0.1 * beat) * (1.0 - 0.8 * u_blink);

	// New message: a flash at the point and a ripple ring travelling out to the edge.
	float ringR = (1.0 - u_ripple) * 1.4;
	col += mix(c3, vec3(1.0), 0.5) * exp(-pow((dr - ringR) * 5.5, 2.0)) * u_ripple * 0.6;
	col += vec3(1.0) * exp(-dr * dr * 14.0) * u_pop * 0.45;

	float lum = dot(col, vec3(0.299, 0.587, 0.114));
	col = mix(vec3(lum), col, u_light.w);

	// Fuzzy edge, like the CSS orb.
	float alpha = 1.0 - smoothstep(radius - u_body.y, radius + u_body.y + 0.1, r);
	gl_FragColor = vec4(col * alpha, alpha);
}`;

	function brandColours(): number[][] {
		const css = getComputedStyle(document.documentElement);
		return [1, 2, 3, 4].map((i) => {
			const hex = css.getPropertyValue(`--brand-${i}`).trim().replace('#', '');
			return [0, 2, 4].map((o) => parseInt(hex.slice(o, o + 2), 16) / 255);
		});
	}

	onMount(() => {
		const gl = canvas.getContext('webgl', {
			premultipliedAlpha: true,
			alpha: true,
			antialias: true
		});
		if (!gl) return void onfail?.();

		const shader = (type: number, src: string) => {
			const s = gl.createShader(type)!;
			gl.shaderSource(s, src);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
			return s;
		};
		const program = gl.createProgram()!;
		gl.attachShader(program, shader(gl.VERTEX_SHADER, VERT));
		gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAG));
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return void onfail?.();
		gl.useProgram(program);

		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		const loc = gl.getAttribLocation(program, 'p');
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

		const u = (name: string) => gl.getUniformLocation(program, name);
		const [b1, b2, b3, b4] = brandColours();
		gl.uniform3fv(u('c1'), b1);
		gl.uniform3fv(u('c2'), b2);
		gl.uniform3fv(u('c3'), b3);
		gl.uniform3fv(u('c4'), b4);
		gl.uniform1f(u('u_scale'), SCALE);

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const px = Math.round(size * SCALE * dpr);
		canvas.width = canvas.height = px;
		gl.viewport(0, 0, px, px);
		gl.uniform2f(u('u_res'), px, px);

		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		let energy = 0;
		let lively = 0.35; // eased: how far the point wanders (see the shader's u_body.w)
		let visible = true;
		let raf = 0;
		let last = performance.now();
		// Random starting phases, so orbs on one page don't move in sync.
		const phase = [0, 0, 0, 0].map(() => Math.random() * 100);

		// Gaze: the eye only follows the pointer while it's interested. Interest is sparked by interacting — pressing a
		// control (input, button, link…), focusing a field, or pressing the orb — and lasts `tune.attention` seconds
		// after the latest interaction. Then it loses interest and drifts back to its natural, wandering position.
		let gaze = [0, 0];
		let pointer: [number, number] | null = null;
		let interestedUntil = 0;
		const INTERACTIVE =
			'input, textarea, select, button, a[href], [role="button"], [contenteditable], label';
		const spark = () => (interestedUntil = performance.now() + tune.attention * 1000);
		const onpointermove = (e: PointerEvent) => (pointer = [e.clientX, e.clientY]);
		const onpointerdown = (e: PointerEvent) => {
			pointer = [e.clientX, e.clientY];
			const target = e.target as Element | null;
			if (target?.closest(INTERACTIVE) || canvas.parentElement?.contains(target)) spark();
		};
		const onfocusin = (e: FocusEvent) => {
			if ((e.target as Element | null)?.closest('input, textarea, select, [contenteditable]'))
				spark();
		};
		function gazeTarget(now: number): [number, number] {
			if (!pointer || now > interestedUntil) return [0, 0];
			const box = canvas.getBoundingClientRect();
			const dx = pointer[0] - (box.left + box.width / 2);
			const dy = box.top + box.height / 2 - pointer[1];
			const dist = Math.hypot(dx, dy);
			const reach = Math.min(1, dist / tune.gazeReach); // looks further as the pointer gets further away
			return dist ? [(dx / dist) * reach, (dy / dist) * reach] : [0, 0];
		}
		if (follow) {
			window.addEventListener('pointermove', onpointermove);
			window.addEventListener('pointerdown', onpointerdown, true);
			window.addEventListener('focusin', onfocusin);
		}

		const draw = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			const target = state === 'thinking' ? 1 : state === 'speaking' ? 0.35 : 0;
			energy += (target - energy) * Math.min(1, dt * 3); // ease between states
			pop = Math.max(0, pop - dt * 2.2);
			// Integrate each phase at its current speed, so speed changes (energy, the Tempo slider) never make it jump.
			phase[0] += dt * (0.18 + 0.9 * energy);
			phase[1] += dt * 1.3 * (1 + 2 * energy);
			phase[2] += dt * (tune.tempo + energy);
			phase[3] += dt * (1.6 + 3.5 * energy);
			const look = gazeTarget(now);
			const interested = now <= interestedUntil;
			const livelyTarget = interested ? 1 : 0.35 + 0.65 * Math.min(1, energy * 1.5);
			lively += (livelyTarget - lively) * Math.min(1, dt * 1.5);
			// Glide, don't snap; losing interest is slower than paying attention, so it drifts off rather than looks away.
			const ease = tune.gazeEase * (interested ? 1 : 0.35);
			gaze = gaze.map((g, i) => g + (look[i] - g) * Math.min(1, dt * ease));
			gl.uniform4f(u('u_phase'), phase[0], phase[1], phase[2], phase[3]);
			gl.uniform1f(u('u_energy'), energy);
			gl.uniform1f(u('u_pop'), Math.sin(pop * Math.PI) * pop); // quick swell, smooth settle
			gl.uniform1f(u('u_ripple'), pop);
			gl.uniform2f(u('u_gaze'), gaze[0], gaze[1]);
			gl.uniform1f(u('u_blink'), blinkAt(now));
			gl.uniform4f(u('u_motion'), tune.tempo, tune.wander, tune.gaze, tune.maxDistance);
			gl.uniform4f(u('u_spiral'), tune.curl, tune.arms, tune.twist, tune.spin);
			gl.uniform4f(u('u_light'), tune.core, tune.coreSize, tune.halo, tune.saturation);
			gl.uniform4f(u('u_body'), tune.flow, tune.edge, tune.wobble, lively);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			if (visible && !reduced) raf = requestAnimationFrame(draw);
		};
		raf = requestAnimationFrame(draw);

		// Pause when off screen.
		const io = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			if (visible && !reduced) {
				last = performance.now();
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(draw);
			}
		});
		io.observe(canvas);

		return () => {
			cancelAnimationFrame(raf);
			io.disconnect();
			window.removeEventListener('pointermove', onpointermove);
			window.removeEventListener('pointerdown', onpointerdown, true);
			window.removeEventListener('focusin', onfocusin);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		};
	});
</script>

<canvas
	bind:this={canvas}
	class="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2"
	style:width="{size * SCALE}px"
	style:height="{size * SCALE}px"
	aria-hidden="true"
></canvas>
