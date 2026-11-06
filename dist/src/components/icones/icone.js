const desenhos = {
  olho: [ ['path', { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z' }], ['circle', { cx: '12', cy: '12', r: '3' }] ],
  bandeira: [ ['path', { d: 'M5 3v18' }], ['path', { d: 'M5 4c4-3 8 3 13 0v10c-5 3-9-3-13 0V4Z', class: 'bandeira-tecido' }] ],
};
export function criarIcone(nome) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [chave, valor] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(chave, valor);
  for (const [tag, atributos] of desenhos[nome]) {
    const parte = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [chave, valor] of Object.entries(atributos)) parte.setAttribute(chave, valor);
    svg.append(parte);
  }
  return svg;
}
