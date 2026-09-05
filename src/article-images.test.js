import assert from 'node:assert/strict';
import test from 'node:test';
import { articleContentWithImages, attachImagesToSummary } from './article-images.js';

test('extracts article images in order and keeps the largest responsive variant', () => {
  const html = `
    <article>
      <p>Primera novedad.</p>
      <amp-img src="https://px.cdn.lanueva.com/082026/123/hotel.jpg?cw=262"></amp-img>
      <amp-img src="https://px.cdn.lanueva.com/082026/123/hotel.jpg?cw=807"></amp-img>
      <p>Segunda novedad.</p>
      <img src="https://pxcdn.lanueva.com/082026/456/muelle.webp?cw=1121&amp;extw=jpg">
      <img src="https://pxcdn.lanueva.com/perfil/autor.png">
    </article>`;

  const result = articleContentWithImages(html);

  assert.equal(result.text, 'Primera novedad. [IMG_01] Segunda novedad. [IMG_02]');
  assert.deepEqual(result.images, [
    { id: 'IMG_01', url: 'https://px.cdn.lanueva.com/082026/123/hotel.jpg?cw=807' },
    { id: 'IMG_02', url: 'https://pxcdn.lanueva.com/082026/456/muelle.webp?cw=1121&extw=jpg' },
  ]);
});

test('places selected images under their bullet and removes model markers', () => {
  const summary = '- Abre el hotel. [IMG_01]\n- Construirán el muelle. [IMG_02] [IMG_03]';
  const images = [
    { id: 'IMG_01', url: 'https://example.com/hotel.jpg' },
    { id: 'IMG_02', url: 'https://example.com/muelle.jpg' },
  ];

  assert.equal(
    attachImagesToSummary(summary, images),
    '- Abre el hotel.\n  ![Imagen de la nota original](https://example.com/hotel.jpg)\n- Construirán el muelle.\n  ![Imagen de la nota original](https://example.com/muelle.jpg)',
  );
});
