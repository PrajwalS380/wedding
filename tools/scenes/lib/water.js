import { THREE, GLSL_NOISE } from './common.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'

/** Calm lake: mirror reflection broken by wind ripples, with a glitter path under the sun. */
export function makeWater({ size = 6000, W = 512, H = 1024, sunDir, tint = 0x8a8a8a, ripple = 0.022, glitter = 1.0, minReflect = 0.18 } = {}) {
  const shader = {
    name: 'LakeShader',
    uniforms: {
      color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
      sunDir: { value: sunDir.clone() }, ripple: { value: ripple }, glitter: { value: glitter }, tint: { value: new THREE.Color(tint) }, minReflect: { value: minReflect },
    },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix; varying vec4 vUvR; varying vec3 vWorld;
      void main(){ vUvR = textureMatrix * vec4(position,1.); vec4 w = modelMatrix*vec4(position,1.); vWorld=w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color; uniform sampler2D tDiffuse; uniform vec3 sunDir; uniform float ripple, glitter, minReflect; uniform vec3 tint;
      varying vec4 vUvR; varying vec3 vWorld;
      ${GLSL_NOISE}
      float wave(vec2 p){ return fbm2(p*vec2(0.09,0.55)) + 0.5*fbm2(p*vec2(0.35,2.2)+3.1); }
      void main(){
        vec2 p = vWorld.xz; float e = 0.06;
        float h0 = wave(p), hx = wave(p+vec2(e,0.)), hz = wave(p+vec2(0.,e));
        vec3 n = normalize(vec3(-(hx-h0)/e*0.35, 1., -(hz-h0)/e*0.35));
        vec3 V = normalize(cameraPosition - vWorld);
        float dist = length(cameraPosition - vWorld);
        vec4 uv = vUvR; uv.xy += n.xz * ripple * uv.w * (1.0 + 30.0/ max(dist,5.0));
        vec3 refl = texture2DProj(tDiffuse, uv).rgb;
        // soft vertical smear like real ripples
        vec4 uv2 = uv; uv2.y += 0.004*uv.w; refl = mix(refl, texture2DProj(tDiffuse, uv2).rgb, 0.4);
        float fres = 0.04 + 0.96*pow(1.0 - max(dot(V, vec3(0,1,0)),0.), 5.0);
        vec3 col = refl * tint * mix(minReflect, 1.0, fres);
        // sun glitter path
        vec3 R = reflect(-V, n);
        float s = max(dot(R, sunDir), 0.);
        vec2 rh = normalize(R.xz), sh = normalize(sunDir.xz);
        float column = smoothstep(0.9965, 0.99985, dot(rh, sh));
        float spark = pow(s, 3000.0)*14.0 + pow(s, 400.0)*0.6;
        float grain = smoothstep(0.72, 0.97, hash12(floor(p*vec2(12.0,46.0))));
        col += vec3(1.0,0.7,0.4) * spark * glitter * grain * column;
        col += vec3(1.0,0.55,0.3) * pow(s, 60.0) * 0.18 * glitter * column;
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }
  const water = new Reflector(new THREE.PlaneGeometry(size, size), { textureWidth: W, textureHeight: H, clipBias: 0.003, shader, multisample: 4 })
  water.rotation.x = -Math.PI / 2
  return water
}

/** Polished stone floor: blurred mirror reflection over a speckled granite base. */
export function makeGlossFloor({ size = 40, W = 512, H = 512, base = 0x0b0a0a, reflect = 0.55, blur = 0.004, speckle = 1 } = {}) {
  const shader = {
    name: 'GlossFloor',
    uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, base: { value: new THREE.Color(base) }, reflectAmt: { value: reflect }, blur: { value: blur }, speckle: { value: speckle } },
    vertexShader: /* glsl */ `uniform mat4 textureMatrix; varying vec4 vUvR; varying vec3 vWorld;
      void main(){ vUvR = textureMatrix*vec4(position,1.); vec4 w=modelMatrix*vec4(position,1.); vWorld=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; uniform vec3 base; uniform float reflectAmt, blur, speckle; varying vec4 vUvR; varying vec3 vWorld;
      ${GLSL_NOISE}
      void main(){
        vec3 refl=vec3(0.); float tot=0.;
        for(int i=-4;i<=4;i++){ for(int j=-1;j<=1;j++){ vec4 uv=vUvR; uv.x+=float(j)*blur*0.5*uv.w; uv.y+=float(i)*blur*uv.w; float w=1.0-abs(float(i))/5.0; refl+=texture2DProj(tDiffuse,uv).rgb*w; tot+=w; } }
        refl/=tot;
        vec2 p=vWorld.xz*900.0; vec2 cell=floor(p); vec2 h2=hash22(cell); float dd=length(fract(p)-h2);
        float fleck=smoothstep(0.35,0.0,dd)*step(0.82,hash12(cell+7.0));
        float n=fbm2(vWorld.xz*14.0);
        vec3 granite=base*(0.75+0.5*n) + vec3(0.035,0.032,0.03)*fleck*speckle;
        vec3 V=normalize(cameraPosition-vWorld); float fres=0.06+0.94*pow(1.0-max(V.y,0.),4.0);
        gl_FragColor=vec4(granite+refl*reflectAmt*mix(0.35,1.0,fres),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }
  const floor = new Reflector(new THREE.PlaneGeometry(size, size), { textureWidth: W, textureHeight: H, clipBias: 0.001, shader, multisample: 4 })
  floor.rotation.x = -Math.PI / 2
  return floor
}
