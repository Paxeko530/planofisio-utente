/* Motor de figuras animadas SVG. Origem: app Continuar em Movimento v1.3 (código próprio do João). */
const SVGNS="http://www.w3.org/2000/svg";
const CHAO=152, TRONCO=46, COXA=36, PERNA=36, BRACO=27, ANTE=25, RCAB=11, PE=14;

function el(n,a){const e=document.createElementNS(SVGNS,n);for(const k in a)e.setAttribute(k,a[k]);return e;}
const rad=g=>g*Math.PI/180;
function seg(x,y,ang,len){return [x+Math.sin(rad(ang))*len, y+Math.cos(rad(ang))*len];}
function lerp(a,b,t){return a+(b-a)*t;}
function poseInterp(a,b,t){const o={};const ks=new Set([...Object.keys(a),...Object.keys(b)]);
  ks.forEach(k=>o[k]=lerp(a[k]??0,b[k]??0,t)); return o;}

/* esqueleto: devolve todos os pontos a partir de uma pose */
function esqueleto(p, ex){
  const hx=p.hx??110, hy=p.hy??80, tr=p.tronco??0;
  const anca=[hx,hy];
  const acima=(x,y,ang,len)=>[x+Math.sin(rad(ang))*len, y-Math.cos(rad(ang))*len];
  const ombro=acima(hx,hy,tr,TRONCO);
  const pescoco=acima(ombro[0],ombro[1],tr,8);
  const cabeca=acima(ombro[0],ombro[1],tr*1.1,8+RCAB);
  const larg = ex.frente ? 9 : 3;               // afastamento das ancas/ombros
  function membroPerna(dx, coxa, perna, levantada){
    const q=[hx+dx,hy];
    const joelho=seg(q[0],q[1],coxa,COXA);
    const tornozelo=seg(joelho[0],joelho[1],perna,PERNA);
    const apoiado = tornozelo[1] < CHAO-8;   // em cima de um degrau ou banco
    const dedo = levantada ? seg(tornozelo[0],tornozelo[1],perna+80,PE)
               : (apoiado ? [tornozelo[0]+PE, tornozelo[1]+2] : [tornozelo[0]+PE, CHAO]);
    return {q,joelho,tornozelo,dedo,levantada};
  }
  function membroBraco(dx, braco, ante){
    const o=[ombro[0]+dx,ombro[1]];
    const cotovelo=seg(o[0],o[1],braco,BRACO);
    const mao=seg(cotovelo[0],cotovelo[1],ante,ANTE);
    return {o,cotovelo,mao};
  }
  const pN=membroPerna(larg, p.coxaN??0, p.pernaN??0, (p.levantadaN??0)>0.5);
  const pF=membroPerna(-larg, p.coxaF??(ex.frente?-(p.coxaN??0):(p.coxaN??0)*0.8), p.pernaF??(p.pernaN??0)*0.8, false);
  const bN=membroBraco(larg, p.bracoN??0, p.anteN??0);
  const bF=membroBraco(-larg, p.bracoF??(ex.frente?-(p.bracoN??0):(p.bracoN??0)*0.75), p.anteF??(ex.frente?-(p.anteN??0):(p.anteN??0)*0.75));
  return {anca,ombro,pescoco,cabeca,pN,pF,bN,bF};
}

function desenhaProps(g, ex, eA){
  const c="var(--ink2)", w=4.5;
  const path=(d,op)=>g.appendChild(el("path",{d,stroke:c,"stroke-width":w,fill:"none","stroke-linecap":"round","stroke-linejoin":"round",opacity:op??.8}));
  switch(ex.prop){
    case "cadeira": {
      const y=eA.anca[1]+6, x0=eA.anca[0]-52, x1=eA.anca[0]+10;
      path(`M${x0} ${y} L${x1} ${y} M${x0} ${y} L${x0} ${y-46} M${x0+6} ${y} L${x0+6} ${CHAO} M${x1-6} ${y} L${x1-6} ${CHAO}`);
      break; }
    case "cadeiraApoio": {
      const x=eA.bF.mao[0]+8, y=eA.bF.mao[1]+4;
      path(`M${x} ${y} L${x+44} ${y} M${x+2} ${y} L${x+2} ${y-44} M${x+4} ${y} L${x+4} ${CHAO} M${x+40} ${y} L${x+40} ${CHAO}`);
      break; }
    case "bancada": {
      const y=eA.bN.mao[1]+5;
      path(`M${eA.bN.mao[0]-14} ${y} L228 ${y} M${eA.bN.mao[0]+24} ${y} L${eA.bN.mao[0]+24} ${CHAO}`);
      break; }
    case "banco": {
      const y=eA.pN.tornozelo[1]+6, x=eA.pN.tornozelo[0]-16;
      path(`M${x} ${y} L${x+52} ${y} M${x+6} ${y} L${x+6} ${CHAO} M${x+46} ${y} L${x+46} ${CHAO}`);
      break; }
    case "degrau": {
      const y=eA.pN.tornozelo[1]+4, x=eA.pN.tornozelo[0]-26;
      path(`M${x} ${CHAO} L${x} ${y} L${x+86} ${y} L${x+86} ${CHAO}`);
      path(`M${x+40} ${y} L${x+40} ${y-26} L${x+86} ${y-26}`,.45);
      path(`M${x+94} ${CHAO} L${x+94} ${y-84}`,.6);
      break; }
    case "parede": case "porta": {
      const x=eA.bN.mao[0]+8;
      path(`M${x} 14 L${x} ${CHAO}`);
      if(ex.prop==="porta") path(`M${x} 18 L${x-74} 18`,.6);
      break; }
    case "cama": path(`M26 ${CHAO} L214 ${CHAO}`); break;
    case "linha": g.appendChild(el("path",{d:`M24 ${CHAO} L216 ${CHAO}`,stroke:c,"stroke-width":3,
      "stroke-dasharray":"9 8","stroke-linecap":"round",opacity:.7})); break;
  }
  if(ex.prop!=="cama"&&ex.prop!=="linha")
    g.appendChild(el("path",{d:`M20 ${CHAO} L220 ${CHAO}`,stroke:c,"stroke-width":3,"stroke-linecap":"round",opacity:.45}));
}

function desenhaSeta(g, ex, eA, eB){
  if(!ex.rastro) return;
  const map=e=>({anca:e.anca, ombro:e.ombro, maoN:e.bN.mao, peN:e.pN.tornozelo}[ex.rastro]);
  const A=map(eA), B=map(eB);
  const dx=B[0]-A[0], dy=B[1]-A[1];
  if(Math.hypot(dx,dy)<14) return;
  const mx=(A[0]+B[0])/2 - dy*0.22, my=(A[1]+B[1])/2 + dx*0.22;
  const cor="var(--verde-t)";
  g.appendChild(el("path",{d:`M${A[0]} ${A[1]} Q${mx} ${my} ${B[0]} ${B[1]}`,stroke:cor,"stroke-width":3,
    fill:"none","stroke-dasharray":"7 7","stroke-linecap":"round",opacity:.7}));
  const ang=Math.atan2(B[1]-my, B[0]-mx)*180/Math.PI;
  g.appendChild(el("path",{d:"M0 0 L-9 -5 L-9 5 Z",fill:cor,opacity:.8,
    transform:`translate(${B[0]},${B[1]}) rotate(${ang})`}));
}

/* --- corpo em silhueta: membros com volume, cabeça, calçado --- */
function capsula(p1,p2,w1,w2){
  const dx=p2[0]-p1[0], dy=p2[1]-p1[1], L=Math.hypot(dx,dy)||1;
  const nx=-dy/L, ny=dx/L, a=w1/2, b=w2/2;
  return `M${p1[0]+nx*a} ${p1[1]+ny*a} L${p2[0]+nx*b} ${p2[1]+ny*b} L${p2[0]-nx*b} ${p2[1]-ny*b} L${p1[0]-nx*a} ${p1[1]-ny*a} Z`;
}
function desenhaCorpo(g, e, ex){
  const pele="var(--ink)";
  const forma=(d,cor,op)=>g.appendChild(el("path",{d,fill:cor||pele,opacity:op??1}));
  const junta=(p,r,cor,op)=>g.appendChild(el("circle",{cx:p[0],cy:p[1],r,fill:cor||pele,opacity:op??1}));

  function sapato(tornozelo,dedo,op){
    const dx=dedo[0]-tornozelo[0], dy=dedo[1]-tornozelo[1], L=Math.hypot(dx,dy)||1;
    const ux=dx/L, uy=dy/L, nx=-uy, ny=ux;
    const p0=[tornozelo[0]-ux*3+nx*5.5, tornozelo[1]-uy*3+ny*5.5];
    const p1=[dedo[0]+ux*3+nx*3.5, dedo[1]+uy*3+ny*3.5];
    const p2=[dedo[0]+ux*3-nx*3.5, dedo[1]+uy*3-ny*3.5];
    const p3=[tornozelo[0]-ux*3-nx*5.5, tornozelo[1]-uy*3-ny*5.5];
    forma(`M${p0[0]} ${p0[1]} Q${(p0[0]+p1[0])/2+nx*2} ${(p0[1]+p1[1])/2+ny*2} ${p1[0]} ${p1[1]} L${p2[0]} ${p2[1]} L${p3[0]} ${p3[1]} Z`, "var(--ink2)", op);
  }
  function perna(m,op){
    forma(capsula(m.q,m.joelho,13,9.5),null,op);          // coxa
    junta(m.q,6.5,null,op); junta(m.joelho,4.9,null,op);
    forma(capsula(m.joelho,m.tornozelo,9.5,6.5),null,op); // perna
    junta(m.tornozelo,3.3,null,op);
    sapato(m.tornozelo,m.dedo,op);
  }
  function braco(m,op){
    forma(capsula(m.o,m.cotovelo,9.5,7.5),null,op);
    junta(m.o,4.8,null,op); junta(m.cotovelo,3.8,null,op);
    forma(capsula(m.cotovelo,m.mao,7.5,5.5),null,op);
    junta(m.mao,4.2,null,op);                              // mão
  }

  // sombra no chão
  g.appendChild(el("ellipse",{cx:e.anca[0],cy:CHAO+3,rx:32,ry:5,fill:"var(--ink2)",opacity:.16}));

  // lado afastado
  perna(e.pF,.42); braco(e.bF,.42);

  // objeto atrás do corpo
  if(ex.prop==="saco"){
    const m=e.bN.mao;
    g.appendChild(el("path",{d:`M${m[0]-10} ${m[1]+6} L${m[0]-8} ${m[1]+26} L${m[0]+8} ${m[1]+26} L${m[0]+10} ${m[1]+6} Z`,
      fill:"var(--card)",stroke:"var(--ink2)","stroke-width":3.5,"stroke-linejoin":"round"}));
    g.appendChild(el("path",{d:`M${m[0]-5} ${m[1]+6} Q${m[0]} ${m[1]-3} ${m[0]+5} ${m[1]+6}`,
      fill:"none",stroke:"var(--ink2)","stroke-width":3}));
  }

  // tronco: ombros mais largos que a anca
  const o=e.ombro, a=e.anca;
  const dx=o[0]-a[0], dy=o[1]-a[1], L=Math.hypot(dx,dy)||1;
  const nx=-dy/L, ny=dx/L;
  const lo=15, la=11.5;
  const O1=[o[0]+nx*lo,o[1]+ny*lo], O2=[o[0]-nx*lo,o[1]-ny*lo];
  const A1=[a[0]+nx*la,a[1]+ny*la], A2=[a[0]-nx*la,a[1]-ny*la];
  const cintura=0.42;
  const C1=[a[0]+dx*cintura+nx*10.5, a[1]+dy*cintura+ny*10.5];
  const C2=[a[0]+dx*cintura-nx*10.5, a[1]+dy*cintura-ny*10.5];
  forma(`M${O1[0]} ${O1[1]} Q${C1[0]} ${C1[1]} ${A1[0]} ${A1[1]} L${A2[0]} ${A2[1]} Q${C2[0]} ${C2[1]} ${O2[0]} ${O2[1]} Z`);
  junta(o,14.5); junta(a,11.5);

  // pescoço e cabeça
  forma(capsula(e.ombro,e.pescoco,10,8.5));
  const c=e.cabeca, inc=(e.cabeca[0]-e.ombro[0])*0.55;
  // cabelo atrás (dá leitura de cabeça sem parecer capacete)
  g.appendChild(el("ellipse",{cx:c[0]-2.5,cy:c[1]-2.5,rx:RCAB+0.5,ry:RCAB+2,fill:"var(--ink2)",opacity:.55,
    transform:`rotate(${inc} ${c[0]} ${c[1]})`}));
  g.appendChild(el("ellipse",{cx:c[0],cy:c[1],rx:RCAB-0.5,ry:RCAB+1.5,fill:pele,
    transform:`rotate(${inc} ${c[0]} ${c[1]})`}));

  // lado próximo
  perna(e.pN,1); braco(e.bN,1);

  // objetos nas mãos
  if(ex.prop==="garrafas"){
    [[e.bN.mao,1],[e.bF.mao,.45]].forEach(([h,op])=>{
      g.appendChild(el("rect",{x:h[0]-5,y:h[1]-2,width:10,height:19,rx:4,
        fill:"var(--card)",stroke:"var(--ink2)","stroke-width":3.5,opacity:op}));
      g.appendChild(el("rect",{x:h[0]-2,y:h[1]-6,width:4,height:5,rx:1.2,
        fill:"var(--ink2)",opacity:op}));
    });
  }
}

function desenhaEspecial(g, ex, p){
  const pele="var(--ink)";
  const forma=(d,cor,op)=>g.appendChild(el("path",{d,fill:cor||pele,opacity:op??1}));
  const seg2=(p1,p2,w1,w2,op)=>{ forma(capsula(p1,p2,w1,w2),null,op);
    g.appendChild(el("circle",{cx:p1[0],cy:p1[1],r:w1/2,fill:pele,opacity:op??1}));
    g.appendChild(el("circle",{cx:p2[0],cy:p2[1],r:w2/2,fill:pele,opacity:op??1})); };
  const junta=(c,r,op)=>g.appendChild(el("circle",{cx:c[0],cy:c[1],r,fill:pele,opacity:op??1}));
  function cabeca(c,inc,op){
    g.appendChild(el("ellipse",{cx:c[0]-2.5,cy:c[1]-2.5,rx:RCAB+0.5,ry:RCAB+2,fill:"var(--ink2)",opacity:(op??1)*.55,
      transform:`rotate(${inc||0} ${c[0]} ${c[1]})`}));
    g.appendChild(el("ellipse",{cx:c[0],cy:c[1],rx:RCAB-0.5,ry:RCAB+1.5,fill:pele,opacity:op??1,
      transform:`rotate(${inc||0} ${c[0]} ${c[1]})`}));
  }
  function sapato(a,b,op){
    const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L, nx=-uy, ny=ux;
    forma(`M${a[0]-ux*3+nx*5.5} ${a[1]-uy*3+ny*5.5} L${b[0]+ux*3+nx*3.5} ${b[1]+uy*3+ny*3.5}
      L${b[0]+ux*3-nx*3.5} ${b[1]+uy*3-ny*3.5} L${a[0]-ux*3-nx*5.5} ${a[1]-uy*3-ny*5.5} Z`,"var(--ink2)",op);
  }

  if(ex.deitado){                                   // ponte
    const alt=p.alt||0;
    const ombro=[88,CHAO-13], anca=[128,CHAO-13-alt], joelho=[164,CHAO-42-alt*0.25], pe=[168,CHAO-4];
    g.appendChild(el("ellipse",{cx:128,cy:CHAO+3,rx:48,ry:4.5,fill:"var(--ink2)",opacity:.14}));
    seg2(ombro,anca,27,23);                          // tronco deitado
    seg2(anca,joelho,13,9.5); junta(joelho,5);
    seg2(joelho,pe,9.5,6.5); sapato(pe,[pe[0]+12,CHAO],1);
    seg2(ombro,[ombro[0]+20,CHAO-5],9,7,.5);         // braço no chão
    junta([ombro[0]+20,CHAO-5],4,.5);
    cabeca([68,CHAO-18],-12);
    seg2(ombro,[74,CHAO-16],11,9);                   // pescoço
    return;
  }
  if(ex.sentado){                                   // rotação do tronco, sentada
    const rot=p.rot||0, r=rad(rot);
    const anca=[120,114], ombro=[120+Math.sin(r)*11,68];
    g.appendChild(el("ellipse",{cx:128,cy:CHAO+3,rx:34,ry:4.5,fill:"var(--ink2)",opacity:.14}));
    g.appendChild(el("path",{d:`M94 ${CHAO} L94 114 L152 114 M94 114 L94 60`,stroke:"var(--ink2)",
      "stroke-width":4.5,fill:"none","stroke-linecap":"round",opacity:.8}));
    // pernas (vista de frente)
    seg2([anca[0]-11,anca[1]],[anca[0]-15,132],13,10); seg2([anca[0]-15,132],[anca[0]-15,CHAO-4],10,7);
    sapato([anca[0]-15,CHAO-4],[anca[0]-15,CHAO],1);
    seg2([anca[0]+11,anca[1]],[anca[0]+17,132],13,10); seg2([anca[0]+17,132],[anca[0]+17,CHAO-4],10,7);
    sapato([anca[0]+17,CHAO-4],[anca[0]+17,CHAO],1);
    // tronco rodado
    const larg=15+9*Math.abs(Math.cos(r));
    forma(`M${ombro[0]-larg} ${ombro[1]} Q${anca[0]-12} ${(ombro[1]+anca[1])/2} ${anca[0]-11} ${anca[1]}
      L${anca[0]+11} ${anca[1]} Q${anca[0]+12} ${(ombro[1]+anca[1])/2} ${ombro[0]+larg} ${ombro[1]} Z`);
    g.appendChild(el("circle",{cx:ombro[0]-larg,cy:ombro[1],r:7.5,fill:pele}));
    g.appendChild(el("circle",{cx:ombro[0]+larg,cy:ombro[1],r:7.5,fill:pele}));
    // braços: um à frente (apoia na cadeira), outro recuado
    seg2([ombro[0]+larg*0.8,ombro[1]+4],[ombro[0]+larg*0.5,96],9.5,7.5);
    junta([ombro[0]+larg*0.5,96],4.5);
    seg2([ombro[0]-larg*0.8,ombro[1]+4],[ombro[0]-larg*1.1,98],9.5,7.5,.45);
    cabeca([ombro[0]+Math.sin(r)*5,52],rot*0.35);
    seg2(ombro,[ombro[0]+Math.sin(r)*4,60],11,9);
    return;
  }
  if(ex.marcha){                                    // calcanhar-ponta
    const t=p.passo||0, av=t*28, hx=98+av, bal=Math.sin(t*Math.PI)*9;
    const anca=[hx,84], ombro=[hx-2,38];
    g.appendChild(el("ellipse",{cx:hx,cy:CHAO+3,rx:28,ry:4.5,fill:"var(--ink2)",opacity:.14}));
    const peA=[hx-15, CHAO-4], peB=[hx+17, CHAO-4];
    // perna de trás (esbatida)
    seg2([anca[0]-6,anca[1]],[peA[0],118],13,10,.42); seg2([peA[0],118],peA,10,7,.42); sapato(peA,[peA[0]+12,CHAO],.42);
    // tronco
    forma(`M${ombro[0]-15} ${ombro[1]} Q${anca[0]-12} 62 ${anca[0]-11} ${anca[1]}
      L${anca[0]+11} ${anca[1]} Q${anca[0]+12} 62 ${ombro[0]+15} ${ombro[1]} Z`);
    junta(ombro,14.5); junta(anca,11.5);
    // braços abertos para equilibrar
    seg2([ombro[0]-14,ombro[1]+2],[ombro[0]-32,ombro[1]+14],9.5,7,.45);
    seg2([ombro[0]+14,ombro[1]+2],[ombro[0]+32,ombro[1]+12],9.5,7);
    junta([ombro[0]+32,ombro[1]+12],4.5);
    // perna da frente
    seg2([anca[0]+6,anca[1]],[peB[0],118-bal],13,10); seg2([peB[0],118-bal],peB,10,7); sapato(peB,[peB[0]+12,CHAO],1);
    cabeca([ombro[0]-1,20],0);
    seg2(ombro,[ombro[0]-1,28],11,9);
    return;
  }
  return false;
}

/* perfis de tempo: força (subida rápida, descida lenta), flex (mantém), ciclo (contínuo) */
function fase(u, perfil){
  if(perfil==="flex"){
    if(u<0.18) return u/0.18;
    if(u<0.76) return 1;
    if(u<0.94) return 1-(u-0.76)/0.18;
    return 0;
  }
  if(perfil==="ciclo") return (1-Math.cos(u*2*Math.PI))/2;
  // força
  if(u<0.28) return (1-Math.cos((u/0.28)*Math.PI))/2;
  if(u<0.40) return 1;
  if(u<0.86) return (1+Math.cos(((u-0.40)/0.46)*Math.PI))/2;
  return 0;
}

function criaFigura(ex){
  const svg=el("svg",{viewBox:(ex.vb?ex.vb.join(" "):"0 0 240 170"),class:"fig",role:"img","aria-label":"Demonstração do exercício: "+ex.nome});
  const gWrap=el("g",{transform:"translate(14,16) scale(0.86)"});
  const gProps=el("g",{}), gSeta=el("g",{}), gCorpo=el("g",{});
  gWrap.appendChild(gProps); gWrap.appendChild(gSeta); gWrap.appendChild(gCorpo);
  svg.appendChild(gWrap);
  const especial = ex.deitado||ex.sentado||ex.marcha;
  let eA=null, eB=null;
  if(!especial){
    eA=esqueleto(ex.a, ex); eB=esqueleto(ex.b, ex);
    desenhaProps(gProps, ex, eA);
    desenhaSeta(gSeta, ex, eA, eB);
  } else {
    desenhaProps(gProps, ex, {anca:[118,112],bN:{mao:[150,96]},bF:{mao:[90,96]},pN:{tornozelo:[150,130]}});
  }
  let t0=null, visivel=true;
  function frame(ts){
    if(!svg.isConnected) return;
    if(visivel){
      if(!t0) t0=ts;
      const u=((ts-t0)%ex.ciclo)/ex.ciclo;
      const t=fase(u, ex.perfil||"forca");
      const p=poseInterp(ex.a, ex.b, t);
      while(gCorpo.firstChild) gCorpo.removeChild(gCorpo.firstChild);
      if(!especial) desenhaCorpo(gCorpo, esqueleto(p, ex), ex);
      else desenhaEspecial(gCorpo, ex, p);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if("IntersectionObserver" in window){
    new IntersectionObserver(es=>{ visivel=es[0].isIntersecting; },{threshold:0.05}).observe(svg);
  }
  return svg;
}

/* Figura parada (t=0 início, t=1 fim) como texto SVG, para a folha do plano partilhada. */
function figuraSvgEstatica(ex, t) {
  const svg = el("svg", { viewBox: ex.vb ? ex.vb.join(" ") : "0 0 240 170", class: "fig", xmlns: SVGNS });
  const gWrap = el("g", { transform: "translate(14,16) scale(0.86)" });
  const gProps = el("g", {}), gCorpo = el("g", {});
  gWrap.appendChild(gProps); gWrap.appendChild(gCorpo);
  svg.appendChild(gWrap);
  const p = poseInterp(ex.a, ex.b, t);
  if (!(ex.deitado || ex.sentado || ex.marcha)) {
    desenhaProps(gProps, ex, esqueleto(ex.a, ex));
    desenhaCorpo(gCorpo, esqueleto(p, ex), ex);
  } else {
    desenhaProps(gProps, ex, {anca:[118,112],bN:{mao:[150,96]},bF:{mao:[90,96]},pN:{tornozelo:[150,130]}});
    desenhaEspecial(gCorpo, ex, p);
  }
  return svg.outerHTML;
}
