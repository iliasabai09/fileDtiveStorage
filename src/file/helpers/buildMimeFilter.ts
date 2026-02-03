type FileTypeFilter = 'image' | 'pdf' | 'video' | 'other';

export function buildMimeFilter(types: FileTypeFilter[]): any[] {
  const filters: any[] = [];

  for (const t of types) {
    if (t === 'image') filters.push({ mimeType: /^image\//i });
    if (t === 'video') filters.push({ mimeType: /^video\//i });
    if (t === 'pdf') filters.push({ mimeType: /^application\/pdf$/i });
    if (t === 'other') {
      filters.push({
        $nor: [
          { mimeType: /^image\//i },
          { mimeType: /^video\//i },
          { mimeType: /^application\/pdf$/i },
        ],
      });
    }
  }

  return filters;
}
