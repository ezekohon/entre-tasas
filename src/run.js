import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { articleContentWithImages, attachImagesToSummary } from './article-images.js';

const SECTION_URL = 'https://www.lanueva.com/seccion/entre-tasas-y-cafe';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const userAgent = 'entre-tasas-resumen/1.0 (+https://github.com/)';

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': userAgent, accept: 'text/html,application/xhtml+xml' },
  });
  if (!response.ok) throw new Error(`No se pudo obtener ${url}: HTTP ${response.status}`);
  return response.text();
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function htmlToText(html) {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function latestArticleUrl(sectionHtml) {
  const matches = [...sectionHtml.matchAll(/href=["']([^"']*\/nota\/[^"']+)["']/gi)];
  const first = matches.at(0)?.[1];
  if (!first) throw new Error('No se encontró ninguna nota en la sección.');
  return new URL(decodeHtml(first), SECTION_URL).href;
}

function articleTitle(articleHtml) {
  const match = articleHtml.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
    ?? articleHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return htmlToText(match?.[1] ?? 'Entre tasas y café');
}

async function summarize(systemPrompt, articleUrl, title, body) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Falta OPENAI_API_KEY. Configurala como secreto de GitHub Actions.');
  const model = process.env.OPENAI_MODEL || 'gpt-5-nano';
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: systemPrompt,
      input: `Fuente: ${articleUrl}\nTítulo: ${title}\n\nArtículo:\n${body}`,
      store: false,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI devolvió HTTP ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  const output = payload.output
    ?.flatMap((item) => item.type === 'message' ? item.content ?? [] : [])
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text)
    .join('')
    .trim();
  if (!output) throw new Error(`OpenAI no devolvió texto de salida: ${JSON.stringify(payload)}`);
  return output;
}

function outputPath() {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  return path.join('output', `${date}.md`);
}

async function main() {
  const systemPrompt = await readFile('config/system-prompt.md', 'utf8');
  const sectionHtml = await fetchText(SECTION_URL);
  const articleUrl = latestArticleUrl(sectionHtml);
  const articleHtml = await fetchText(articleUrl);
  const title = articleTitle(articleHtml);
  const article = articleContentWithImages(articleHtml);
  if (article.text.length < 300) throw new Error('El contenido de la nota es demasiado corto; el sitio pudo haber cambiado.');
  const rawSummary = await summarize(systemPrompt, articleUrl, title, article.text);
  const summary = attachImagesToSummary(rawSummary, article.images);
  const destination = outputPath();
  await mkdir(path.dirname(destination), { recursive: true });
  const imageCredit = summary.includes('![Imagen de la nota original]')
    ? '\n\nImágenes: La Nueva / créditos indicados en la nota original.'
    : '';
  await writeFile(destination, `# ${title}\n\nFuente: ${articleUrl}\n\n${summary}${imageCredit}\n`);
  console.log(`Resumen creado: ${destination}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
