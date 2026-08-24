import { S } from '../core/state.js';
import { cv } from './terrain.js';
import { effectiveQuality, graphicsProfile } from './capabilities.js';

let overlay=null,gl=null,program=null,buffer=null,texture=null,textureW=0,textureH=0,lost=false,failed=false;
const vertex=`#version 300 es
in vec2 a_position;out vec2 v_uv;void main(){v_uv=(a_position+1.0)*0.5;gl_Position=vec4(a_position,0.0,1.0);}`;
const fragment=`#version 300 es
precision mediump float;in vec2 v_uv;uniform sampler2D u_scene;uniform vec4 u_grade;uniform float u_bloom;out vec4 outColor;
void main(){vec2 uv=vec2(v_uv.x,1.0-v_uv.y);vec3 c=texture(u_scene,uv).rgb;c=(c-.5)*u_grade.w+.5;c*=u_grade.rgb;float lum=max(c.r,max(c.g,c.b));c+=max(0.,lum-.72)*u_bloom*.18;float vig=1.-dot(v_uv-.5,v_uv-.5)*.22;c*=vig;outColor=vec4(c,1.);}`;
function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function resources(){
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);textureW=textureH=0;
}
function ensure(){
  if(S.rendererMode==='compatibility'||failed)return false;if(gl&&!lost)return true;
  try{
    if(!overlay){overlay=document.createElement('canvas');overlay.id='gpu-layer';overlay.setAttribute('aria-hidden','true');overlay.style.pointerEvents='none';cv.insertAdjacentElement('afterend',overlay);overlay.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;overlay.hidden=true;S.diagnostics.rendererContextLosses=(S.diagnostics.rendererContextLosses||0)+1;S.diagnostics.rendererBackend='canvas2d-fallback';});overlay.addEventListener('webglcontextrestored',()=>{lost=false;try{resources();overlay.hidden=false;S.diagnostics.rendererContextRestores=(S.diagnostics.rendererContextRestores||0)+1;}catch(e){failed=true;}});}
    gl=overlay.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:false,powerPreference:effectiveQuality()==='battery'?'low-power':'high-performance',failIfMajorPerformanceCaveat:S.rendererMode!=='gpu'});if(!gl)throw new Error('WebGL2 unavailable');resources();overlay.hidden=false;S.diagnostics.rendererBackend='webgl2-hybrid';return true;
  }catch(e){failed=true;if(overlay)overlay.hidden=true;S.diagnostics.rendererBackend='canvas2d-fallback';return false;}
}
export function resetRendererBackend(){try{if(gl){if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);}}catch(e){}if(overlay)overlay.remove();overlay=gl=program=buffer=texture=null;textureW=textureH=0;lost=false;failed=false;S.diagnostics.rendererBackend='canvas2d';S.diagnostics.rendererDrawCalls=0;S.diagnostics.rendererTextures=0;}
export function presentFrame(){
  if(!ensure())return;const profile=graphicsProfile();if(overlay.width!==cv.width||overlay.height!==cv.height){overlay.width=cv.width;overlay.height=cv.height;textureW=textureH=0;}
  gl.viewport(0,0,overlay.width,overlay.height);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bindTexture(gl.TEXTURE_2D,texture);
  if(textureW!==cv.width||textureH!==cv.height){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv);textureW=cv.width;textureH=cv.height;}else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,cv);
  const rain=S.wx?.k==='rain'?S.wx.amt||0:0,dark=Math.max(0,Math.min(1,Math.abs((S.dayT||0)-.5)*2-.35));gl.uniform4f(gl.getUniformLocation(program,'u_grade'),1-rain*.05,1-rain*.015,1+rain*.035,1.035+dark*.025);gl.uniform1f(gl.getUniformLocation(program,'u_bloom'),profile.bloom);gl.drawArrays(gl.TRIANGLES,0,6);
  S.diagnostics.rendererDrawCalls=1;S.diagnostics.rendererTextures=1;S.diagnostics.rendererDpr=innerWidth?cv.width/innerWidth:1;
}
export function rendererSnapshot(){return{backend:S.diagnostics.rendererBackend||'canvas2d',mode:S.rendererMode||'auto',quality:effectiveQuality(),drawCalls:S.diagnostics.rendererDrawCalls||0,textures:S.diagnostics.rendererTextures||0,contextLosses:S.diagnostics.rendererContextLosses||0,contextRestores:S.diagnostics.rendererContextRestores||0};}
