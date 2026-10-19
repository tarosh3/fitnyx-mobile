import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** A readable file name: "fitnyx-report-2026-10.csv". */
export function reportFileName(stem: string, ext: 'csv' | 'pdf'): string {
  return `fitnyx-${stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.${ext}`;
}

async function share(file: File, mimeType: string, UTI: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device');
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle: 'Share your FitNyx report' });
}

export async function shareCsv(csv: string, name: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.write(csv);
  await share(file, 'text/csv', 'public.comma-separated-values-text');
}

/** Renders the HTML to an A4 PDF and opens the share sheet (save to Files, mail, WhatsApp…). */
export async function sharePdf(html: string, name: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  // printToFileAsync names the file with a random id; share a copy with a readable name.
  const named = new File(Paths.cache, name);
  if (named.exists) named.delete();
  new File(uri).copy(named);
  await share(named, 'application/pdf', 'com.adobe.pdf');
}
