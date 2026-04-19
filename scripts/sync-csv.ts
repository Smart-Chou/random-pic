import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

interface ImageEntry {
  id: string;
  url: string;
  category: string;
  enabled: boolean;
  weight: number;
  tags: string[];
}

async function syncFromCsv() {
  const csvPath = join(process.cwd(), 'url.csv');
  const jsonPath = join(process.cwd(), 'data', 'images.json');

  const csvContent = await readFile(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  const images: ImageEntry[] = lines.map((line, index) => ({
    id: String(index + 1),
    url: line.trim(),
    category: 'default',
    enabled: true,
    weight: 1,
    tags: []
  }));

  await writeFile(jsonPath, JSON.stringify(images, null, 2), 'utf-8');
  console.log(`Synced ${images.length} images to data/images.json`);
}

syncFromCsv().catch(console.error);