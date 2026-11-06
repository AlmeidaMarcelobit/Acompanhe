export function textoSemHtml(html = '') {
  return new DOMParser().parseFromString(html || '', 'text/html').body.textContent || '';
}
export function elemento(tag, texto, classe) {
  const no = document.createElement(tag);
  if (texto !== undefined) no.textContent = texto;
  if (classe) no.className = classe;
  return no;
}
