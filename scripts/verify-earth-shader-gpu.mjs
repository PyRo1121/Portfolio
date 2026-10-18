import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
const scene = await readFile('cinematic/scene.js', 'utf8');
const atmosphere = scene.match(/fragmentShader: `(uniform vec3 uColor,uSun;[\s\S]*?)`/)[1];
await mkdir('.audit', { recursive: true });
await writeFile(
	'.audit/flash-probe-client.mjs',
	`
import * as T from 'three';
const renderer = new T.WebGLRenderer({canvas:document.querySelector('canvas')});
renderer.setSize(4,4); const gl=renderer.getContext();
const target = new T.WebGLRenderTarget(4,4,{type:T.FloatType});
const camera = new T.PerspectiveCamera();
const scene = new T.Scene();
const material = new T.ShaderMaterial({uniforms:{uColor:{value:new T.Color(.3,.6,.9)},uSun:{value:new T.Vector3(0,0,1)},testNormal:{value:new T.Vector3()}},vertexShader:'uniform vec3 testNormal;varying vec3 vNormal,vWorld;void main(){vNormal=testNormal;vWorld=vec3(0.);gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:${JSON.stringify(atmosphere)}});
const quad=new T.Mesh(new T.PlaneGeometry(2,2),material);quad.frustumCulled=false;scene.add(quad);
document.querySelector('button').onclick=async()=>{
document.querySelector('button').disabled=true;
const candidate=material.fragmentShader;
const original=candidate.replace('clamp(1.-abs(dot(n,view)),0.,1.)','1.-abs(dot(n,view))');
const results=[];
if(!gl.getExtension('EXT_color_buffer_float')){document.querySelector('output').textContent='UNAVAILABLE: float render targets';return;}
for(const fixed of [false,true]){
 material.fragmentShader=fixed?candidate:original;material.needsUpdate=true;
 let bad=0, max=0, first=null;
 for(let i=0;i<4096;i++){
  if(i%32===0){document.querySelector('output').textContent=(fixed?'Candidate':'Original')+' '+i+'/4096';await new Promise(requestAnimationFrame);}
  const n=new T.Vector3(Math.sin(i*1.71)+.001,Math.cos(i*.731)+.003,Math.sin(i*.319)+.007);
  camera.position.copy(n);camera.updateMatrixWorld();material.uniforms.testNormal.value.copy(n);
  renderer.setRenderTarget(target);renderer.render(scene,camera);
  const values=new Float32Array(64);renderer.readRenderTargetPixels(target,0,0,4,4,values);
  if(values.some(v=>!Number.isFinite(v))){bad++;first??={i,n:n.toArray(),values:[...values.slice(0,4)].map(String)};}
  for(const v of values)if(Number.isFinite(v))max=Math.max(max,v);
 }
 results.push({fixed,bad,max,first});
}
const status=results[1].bad?'FAIL':results[0].bad?'PASS':'INCONCLUSIVE: original fault not reproduced';
document.querySelector('output').textContent=JSON.stringify({status,userAgent:navigator.userAgent,renderer:gl.getParameter(gl.RENDERER),results},null,2);
document.querySelector('button').disabled=false;
};
`
);
await build({
	entryPoints: ['.audit/flash-probe-client.mjs'],
	bundle: true,
	format: 'esm',
	outfile: '.audit/flash-probe-client.js'
});
createServer(async (req, res) => {
	if (req.url === '/probe.js') {
		res.setHeader('Content-Type', 'text/javascript');
		res.end(await readFile('.audit/flash-probe-client.js'));
	} else {
		res.setHeader('Content-Type', 'text/html');
		res.end(
			'<!doctype html><title>Earth atmosphere GPU probe</title><style>body{background:#040710;color:white;font:16px monospace}output{display:block;white-space:pre-wrap}</style><h1>Earth atmosphere GPU probe</h1><canvas></canvas><button>Compare original and bounded shader</button><output>Ready</output><script type="module" src="/probe.js"></script>'
		);
	}
}).listen(8900, '127.0.0.1', () => console.log('GPU shader probe http://127.0.0.1:8900/'));
