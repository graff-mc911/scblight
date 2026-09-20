import React from 'react';
import { PDFWorkspace } from '../components/pdf/PDFWorkspace';

/**
 * Entry route `/pdf-creator` — single unified Soda-style PDF workspace.
 * (Vite + React; same UI architecture as the requested Next.js design.)
 */
export default function PdfCreator() {
  return <PDFWorkspace />;
}
