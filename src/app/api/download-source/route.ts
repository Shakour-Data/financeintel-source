import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import path from 'path';
import fs from 'fs';

export const maxDuration = 60;

const PROJECT_ROOT = path.resolve(process.cwd());

// Directories and files to EXCLUDE from the ZIP
const EXCLUDE_PATTERNS: string[] = [
  'node_modules',
  '.next',
  '.git',
  'pgdata',
  'db',
  'mini-services',
  'dev.log',
  'server.log',
  'agent-ctx',
  '.DS_Store',
  'Thumbs.db',
  'worklog.md',
  '.zscripts',
  'upload',
  'supervisor-node.js',
  'watchdog.sh',
  '3000',
  'tool-results',
  'download',
  'bun.lock',
  'next.pid',
  'comparison-report.html',
  'debug-start.sh',
  'health-check.sh',
  'keep-alive.sh',
  'persistent-server.sh',
  'skills',
  'examples',
];

// File extensions/patterns to EXCLUDE (only outside public/)
const EXCLUDE_FILE_PATTERNS: string[] = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.webp',
  '.svg',
];

function shouldExclude(relativePath: string): boolean {
  const parts = relativePath.split(/[/\\]/);
  // Check directory/file name exclusions
  if (parts.some(part => EXCLUDE_PATTERNS.includes(part))) return true;
  // Check file extension exclusions (only for non-public files)
  const fileName = parts[parts.length - 1] || '';
  const isInPublic = parts.includes('public');
  if (!isInPublic && EXCLUDE_FILE_PATTERNS.some(ext => fileName.toLowerCase().endsWith(ext))) {
    return true;
  }
  return false;
}

export async function GET(_request: NextRequest) {
  try {
    // Collect files
    const files: { relativePath: string; fullPath: string }[] = [];

    function walkDir(dir: string, base: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = base ? `${base}/${entry.name}` : entry.name;

        if (shouldExclude(relativePath)) continue;

        if (entry.isDirectory()) {
          walkDir(fullPath, relativePath);
        } else if (entry.isFile()) {
          files.push({ relativePath, fullPath });
        }
      }
    }

    walkDir(PROJECT_ROOT, '');

    // Create ZIP using JSZip (pure JS, no streams)
    const zip = new JSZip();
    const folder = zip.folder('financeintel-source');

    if (!folder) {
      throw new Error('Failed to create ZIP folder');
    }

    // Add all files to the ZIP
    for (const file of files) {
      const content = fs.readFileSync(file.fullPath);
      folder.file(file.relativePath, content);
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `financeintel-source-${timestamp}.zip`;

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(zipBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[download-source] Error creating ZIP:', error);
    return NextResponse.json(
      { error: 'Failed to create ZIP archive', details: String(error) },
      { status: 500 }
    );
  }
}
