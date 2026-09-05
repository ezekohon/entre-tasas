const ARTICLE_IMAGE_HOSTS = new Set(['pxcdn.lanueva.com', 'px.cdn.lanueva.com']);

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

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1];
}

function articleImage(tag) {
  const rawSrc = attribute(tag, 'src');
  if (!rawSrc) return undefined;

  try {
    const url = new URL(decodeHtml(rawSrc));
    if (!ARTICLE_IMAGE_HOSTS.has(url.hostname) || !/^\/\d{6}\//.test(url.pathname)) return undefined;

    const key = url.pathname.replace(/\.(?:jpe?g|png|webp)$/i, '');
    const width = Number(url.searchParams.get('cw') ?? attribute(tag, 'width') ?? 0);
    return { key, url: url.href, width };
  } catch {
    return undefined;
  }
}

export function articleContentWithImages(articleHtml) {
  const articleMatch = articleHtml.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = articleHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const content = articleMatch?.[1] ?? mainMatch?.[1] ?? articleHtml;
  const imagesByKey = new Map();
  let nextImageNumber = 1;

  const markedContent = content.replace(/<(?:amp-img|img)\b[^>]*>/gi, (tag) => {
    const image = articleImage(tag);
    if (!image) return ' ';

    const existing = imagesByKey.get(image.key);
    if (existing) {
      if (image.width > existing.width) {
        existing.url = image.url;
        existing.width = image.width;
      }
      return ' ';
    }

    const id = `IMG_${String(nextImageNumber).padStart(2, '0')}`;
    nextImageNumber += 1;
    imagesByKey.set(image.key, { id, url: image.url, width: image.width });
    return ` [${id}] `;
  });

  return {
    text: htmlToText(markedContent),
    images: [...imagesByKey.values()].map(({ id, url }) => ({ id, url })),
  };
}

export function attachImagesToSummary(summary, images) {
  const imagesById = new Map(images.map((image) => [image.id, image.url]));
  const usedImages = new Set();

  return summary.split('\n').map((line) => {
    if (!line.trimStart().startsWith('- ')) return line;

    const imageIds = [...line.matchAll(/\[(IMG_\d{2})\]/g)].map((match) => match[1]);
    const cleanLine = line
      .replace(/\s*\[IMG_\d{2}\]/g, '')
      .replace(/\s+([.,;:])/g, '$1')
      .trimEnd();
    const imageLines = imageIds
      .filter((id) => imagesById.has(id) && !usedImages.has(id))
      .map((id) => {
        usedImages.add(id);
        return `  ![Imagen de la nota original](${imagesById.get(id)})`;
      });

    return [cleanLine, ...imageLines].join('\n');
  }).join('\n');
}
