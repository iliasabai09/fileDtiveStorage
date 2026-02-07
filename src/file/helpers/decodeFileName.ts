import * as iconv from 'iconv-lite';

export function decodeFileName(name: string): string {
  return iconv.decode(Buffer.from(name, 'latin1'), 'utf8');
}
