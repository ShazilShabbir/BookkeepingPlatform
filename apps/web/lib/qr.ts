const qrcode = require('./qr-encoder.js');

export function generateQRMatrix(text: string): boolean[][] {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const matrix: boolean[][] = [];
  for (let y = 0; y < n; y++) {
    matrix[y] = [];
    for (let x = 0; x < n; x++) {
      matrix[y][x] = qr.isDark(y, x);
    }
  }
  return matrix;
}
