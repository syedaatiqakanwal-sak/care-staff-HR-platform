import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Button, Modal } from '@mantine/core';
import { Eye } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

type ViewerState =
  | { kind: 'pdf' | 'image'; url: string; name: string }
  | { kind: 'file'; name: string; blob: Blob };

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type ZipEntry = { name: string; method: number; compSize: number; localOffset: number };

function listZipEntries(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocd = -1;
  const scanFrom = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= scanFrom; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return [];
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
    entries.push({ name, method, compSize, localOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readZipEntry(buffer: ArrayBuffer, entryName: string): Promise<Uint8Array | null> {
  const entry = listZipEntries(buffer).find((item) => item.name === entryName);
  if (!entry) return null;
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  if (entry.localOffset + 30 > bytes.length || view.getUint32(entry.localOffset, true) !== 0x04034b50) return null;
  const localNameLen = view.getUint16(entry.localOffset + 26, true);
  const localExtraLen = view.getUint16(entry.localOffset + 28, true);
  const dataStart = entry.localOffset + 30 + localNameLen + localExtraLen;
  const data = bytes.subarray(dataStart, dataStart + entry.compSize);
  if (entry.method === 0) return data;
  if (entry.method === 8) {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return null;
}

async function zipText(buffer: ArrayBuffer, entryName: string): Promise<string> {
  const bytes = await readZipEntry(buffer, entryName);
  return bytes ? new TextDecoder().decode(bytes) : '';
}

async function docxToHtml(buffer: ArrayBuffer): Promise<string> {
  const xml = await zipText(buffer, 'word/document.xml');
  if (!xml) return '<p>This Word document has no readable text.</p>';
  const token = /<w:t\b[^>]*>([^<]*)<\/w:t>|<w:br\b[^>]*\/?>|<w:tab\b[^>]*\/?>/g;
  const html: string[] = [];
  for (const chunk of xml.split(/<w:p\b/).slice(1)) {
    const end = chunk.indexOf('</w:p>');
    const body = end >= 0 ? chunk.slice(0, end) : chunk;
    token.lastIndex = 0;
    let text = '';
    let match: RegExpExecArray | null;
    while ((match = token.exec(body))) {
      if (match[1] != null) text += match[1];
      else if (match[0].startsWith('<w:br')) text += '\n';
      else text += '\t';
    }
    const plain = decodeXml(text).replace(/\u00a0/g, ' ');
    if (!plain.trim()) continue;
    html.push(`<p>${escapeHtml(plain).replace(/\n/g, '<br>')}</p>`);
  }
  return html.join('') || '<p>This Word document has no readable text.</p>';
}

function columnIndex(cellRef: string): number {
  const letters = cellRef.replace(/[0-9]/g, '');
  let index = 0;
  for (const ch of letters) index = index * 26 + (ch.toUpperCase().charCodeAt(0) - 64);
  return Math.max(0, index - 1);
}

async function xlsxToHtml(buffer: ArrayBuffer): Promise<string> {
  const sharedXml = await zipText(buffer, 'xl/sharedStrings.xml');
  const shared: string[] = [];
  if (sharedXml) {
    for (const item of sharedXml.split(/<si\b/).slice(1)) {
      const end = item.indexOf('</si>');
      const body = end >= 0 ? item.slice(0, end) : item;
      shared.push([...body.matchAll(/<t\b[^>]*>([^<]*)<\/t>/g)].map((match) => decodeXml(match[1])).join(''));
    }
  }
  const sheets = listZipEntries(buffer)
    .map((entry) => entry.name)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const blocks: string[] = [];
  for (const sheetName of sheets) {
    const xml = await zipText(buffer, sheetName);
    const rows: string[][] = [];
    for (const rowXml of xml.split(/<row\b/).slice(1)) {
      const end = rowXml.indexOf('</row>');
      const body = end >= 0 ? rowXml.slice(0, end) : rowXml;
      const cells: string[] = [];
      for (const cell of body.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g)) {
        const attrs = cell[1] || cell[3] || '';
        const inner = cell[2] || '';
        const ref = (attrs.match(/\br="([^"]+)"/) || [])[1] || '';
        const type = (attrs.match(/\bt="([^"]+)"/) || [])[1] || '';
        let value = '';
        if (type === 'inlineStr') {
          value = [...inner.matchAll(/<t\b[^>]*>([^<]*)<\/t>/g)].map((match) => decodeXml(match[1])).join('');
        } else if (type === 's') {
          value = shared[Number((inner.match(/<v>([^<]*)<\/v>/) || [])[1] || '')] || '';
        } else if (type === 'b') {
          value = (inner.match(/<v>([^<]*)<\/v>/) || [])[1] === '1' ? 'TRUE' : 'FALSE';
        } else {
          value = decodeXml((inner.match(/<v>([^<]*)<\/v>/) || [])[1] || '');
        }
        cells[columnIndex(ref)] = value;
      }
      if (cells.some((value) => String(value || '').trim())) rows.push(cells);
    }
    if (!rows.length) continue;
    const width = Math.max(...rows.map((row) => row.length));
    const body = rows
      .map((row) => {
        const tds = [];
        for (let i = 0; i < width; i++) tds.push(`<td>${escapeHtml(row[i] || '')}</td>`);
        return `<tr>${tds.join('')}</tr>`;
      })
      .join('');
    const label = sheets.length > 1 ? `<h3>Sheet ${blocks.length + 1}</h3>` : '';
    blocks.push(`${label}<table>${body}</table>`);
  }
  return blocks.join('') || '<p>This spreadsheet has no readable cells.</p>';
}

async function pptxToHtml(buffer: ArrayBuffer): Promise<string> {
  const slides = listZipEntries(buffer)
    .map((entry) => entry.name)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const blocks: string[] = [];
  for (let i = 0; i < slides.length; i++) {
    const xml = await zipText(buffer, slides[i]);
    const lines = [...xml.matchAll(/<a:t\b[^>]*>([^<]*)<\/a:t>/g)]
      .map((match) => decodeXml(match[1]).trim())
      .filter(Boolean);
    blocks.push(
      `<h3>Slide ${i + 1}</h3>${lines.length ? lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('') : '<p></p>'}`,
    );
  }
  return blocks.join('') || '<p>This presentation has no readable text.</p>';
}

function docToText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const parts: string[] = [];
  let current = '';
  const push = () => {
    const text = current.replace(/\s+/g, ' ').trim();
    if (text.length > 2 && /[A-Za-z]/.test(text)) parts.push(text);
    current = '';
  };
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126) || (code >= 160 && code <= 591)) {
      current += String.fromCharCode(code);
    } else {
      push();
    }
  }
  push();
  return parts.join('\n') || 'This Word file has no readable text.';
}

function previewPage(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:24px 28px;color:#1a1a1a;font:15px/1.5 "Segoe UI",Arial,sans-serif}p{margin:0 0 12px}h3{margin:18px 0 8px}table{border-collapse:collapse;width:100%;margin:0 0 20px}td{border:1px solid #E6EBF0;padding:6px 8px;vertical-align:top}pre{white-space:pre-wrap;margin:0}</style></head><body>${body}</body></html>`;
}

async function officePreviewHtml(blob: Blob, name: string): Promise<string> {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const buffer = await blob.arrayBuffer();
  if (ext === 'docx') return previewPage(await docxToHtml(buffer));
  if (ext === 'xlsx') return previewPage(await xlsxToHtml(buffer));
  if (ext === 'pptx') return previewPage(await pptxToHtml(buffer));
  if (ext === 'doc') return previewPage(`<pre>${escapeHtml(docToText(buffer))}</pre>`);
  if (ext === 'csv' || ext === 'txt' || ext === 'rtf') {
    let text = await blob.text();
    if (ext === 'rtf') text = text.replace(/\\par[d]?/g, '\n').replace(/[{}]/g, '').replace(/\\[a-z]+\d* ?/gi, '');
    return previewPage(`<pre>${escapeHtml(text)}</pre>`);
  }
  return '';
}

function FilePreview({ blob, name }: { blob: Blob; name: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let stop = false;
    setLoading(true);
    setMessage('');
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const renderDocx = (globalThis as { renderInhouseDocx?: (file: Blob, element: HTMLElement) => Promise<void> }).renderInhouseDocx;
    (async () => {
      try {
        if (ext === 'docx' && typeof renderDocx === 'function') {
          await renderDocx(blob, el);
        } else {
          const html = await officePreviewHtml(blob, name);
          if (!html) {
            if (!stop) setMessage('This file cannot be shown in the browser.');
            return;
          }
          const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
          el.dataset.objectUrl = url;
          const frame = document.createElement('iframe');
          frame.title = name;
          frame.src = url;
          frame.style.cssText = 'width:100%;height:75vh;border:0;background:#fff;';
          el.append(frame);
        }
      } catch (error) {
        console.error('Failed to display document', error);
        if (!stop) setMessage('Could not open the document.');
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => {
      stop = true;
      const url = el.dataset.objectUrl;
      if (url) URL.revokeObjectURL(url);
      el.replaceChildren();
    };
  }, [blob, name]);

  return (
    <div style={{ minHeight: '75vh', background: '#fff' }}>
      {loading ? <div style={{ padding: 24, color: '#6c757d' }}>Opening document...</div> : null}
      {message ? <div style={{ padding: 24, color: '#6c757d' }}>{message}</div> : null}
      <div ref={hostRef} />
    </div>
  );
}

export function DocumentViewButton({
  documentId,
  fileName,
  variant = 'icon',
}: {
  documentId: string;
  fileName: string;
  variant?: 'icon' | 'button';
}) {
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const closeViewer = () => {
    setViewer((current) => {
      if (current && current.kind !== 'file' && current.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const open = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`/api/v1/documents/${documentId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const headerType = String(res.headers['content-type'] || '').split(';')[0];
      const name = fileName.toLowerCase();
      const blob: Blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const isImage = headerType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/.test(name);
      const isPdf = headerType === 'application/pdf' || name.endsWith('.pdf');
      if (isImage || isPdf) {
        const typed = new Blob([blob], {
          type: isPdf ? 'application/pdf' : headerType.startsWith('image/') ? headerType : 'image/jpeg',
        });
        const url = URL.createObjectURL(typed);
        setViewer((current) => {
          if (current && current.kind !== 'file') URL.revokeObjectURL(current.url);
          return { url, name: fileName, kind: isImage ? 'image' : 'pdf' };
        });
        return;
      }
      setViewer((current) => {
        if (current && current.kind !== 'file') URL.revokeObjectURL(current.url);
        return { kind: 'file', name: fileName, blob };
      });
    } catch {
      notifications.show({ title: 'Error', message: 'Could not open the document', color: 'red' });
    }
  };

  return (
    <>
      {variant === 'button' ? (
        <Button size="xs" variant="light" color="brandBlue" leftSection={<Eye size={14} />} onClick={open}>
          View
        </Button>
      ) : (
        <ActionIcon variant="light" color="brandBlue" aria-label="View document" onClick={open}>
          <Eye size={16} />
        </ActionIcon>
      )}
      <Modal
        opened={!!viewer}
        onClose={closeViewer}
        title={viewer?.name || 'Document'}
        size="xl"
        centered
        styles={{ body: { padding: 0, background: '#fff' } }}
      >
        {viewer?.kind === 'image' ? (
          <img src={viewer.url} alt={viewer.name} style={{ width: '100%', height: 'auto' }} />
        ) : viewer?.kind === 'pdf' ? (
          <iframe title={viewer.name} src={viewer.url} style={{ width: '100%', height: '75vh', border: 'none' }} />
        ) : viewer?.kind === 'file' ? (
          <FilePreview blob={viewer.blob} name={viewer.name} />
        ) : null}
      </Modal>
    </>
  );
}
