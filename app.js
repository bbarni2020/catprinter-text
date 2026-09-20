import * as pdfjsLib from './vendor/pdf.min.mjs';

const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');
const statusLabel = document.getElementById('status');
const preview = document.getElementById('preview');
const printButton = document.getElementById('printButton');

const styleInputs = {
  fontFamily: document.getElementById('fontFamily'),
  fontSize: document.getElementById('fontSize'),
  lineHeight: document.getElementById('lineHeight'),
  letterSpacing: document.getElementById('letterSpacing'),
  textAlign: document.getElementById('textAlign'),
  listStyle: document.getElementById('listStyle'),
  bold: document.getElementById('bold'),
  italic: document.getElementById('italic'),
  underline: document.getElementById('underline'),
  uppercase: document.getElementById('uppercase')
};

pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.mjs';

function setStatus(message, isError = false) {
  statusLabel.textContent = message;
  statusLabel.style.color = isError ? '#b00020' : '#333';
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildStyledHtml(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return '<p></p>';
  }

  const listType = styleInputs.listStyle.value;
  if (listType === 'ul' || listType === 'ol') {
    const items = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
    return `<${listType}>${items}</${listType}>`;
  }

  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
}

function applyStyle() {
  preview.style.fontFamily = styleInputs.fontFamily.value;
  preview.style.fontSize = `${Number(styleInputs.fontSize.value) || 16}px`;
  preview.style.lineHeight = String(Number(styleInputs.lineHeight.value) || 1.4);
  preview.style.letterSpacing = `${Number(styleInputs.letterSpacing.value) || 0}px`;
  preview.style.textAlign = styleInputs.textAlign.value;
  preview.style.fontWeight = styleInputs.bold.checked ? '700' : '400';
  preview.style.fontStyle = styleInputs.italic.checked ? 'italic' : 'normal';
  preview.style.textDecoration = styleInputs.underline.checked ? 'underline' : 'none';
  preview.style.textTransform = styleInputs.uppercase.checked ? 'uppercase' : 'none';
}

function renderPreview() {
  const currentText = textInput.value;
  preview.innerHTML = buildStyledHtml(currentText);
  applyStyle();
}

async function extractTextFromPdf(file) {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ').trim();
    if (pageText) {
      pages.push(pageText);
    }
  }

  return pages.join('\n');
}

async function extractTextFromDocx(file) {
  if (!globalThis.mammoth) {
    throw new Error('DOCX parser is unavailable in this browser.');
  }

  const buffer = await file.arrayBuffer();
  const result = await globalThis.mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || '';
}

async function extractTextFromFile(file) {
  const name = (file.name || '').toLowerCase();

  if (name.endsWith('.txt')) {
    return file.text();
  }

  if (name.endsWith('.pdf')) {
    return extractTextFromPdf(file);
  }

  if (name.endsWith('.docx')) {
    return extractTextFromDocx(file);
  }

  throw new Error('Unsupported file. Please use .txt, .pdf, or .docx.');
}

textInput.addEventListener('input', renderPreview);
fileInput.addEventListener('change', async (event) => {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  try {
    setStatus('Extracting text...');
    const extracted = await extractTextFromFile(file);
    textInput.value = extracted;
    renderPreview();
    setStatus(`Loaded ${file.name}`);
  } catch (error) {
    setStatus(error.message || 'Failed to extract text.', true);
  }
});

Object.values(styleInputs).forEach((input) => {
  input.addEventListener('input', renderPreview);
  input.addEventListener('change', renderPreview);
});

printButton.addEventListener('click', () => {
  renderPreview();
  window.print();
});

renderPreview();
