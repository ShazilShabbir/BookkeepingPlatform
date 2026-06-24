import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { generateSecret, generateOTPAuthURL } from '@/lib/totp';
import { generateQRMatrix } from '@/lib/qr';

function matrixToBMPDataURL(matrix: boolean[][]): string {
  const n = matrix.length;
  const cellSize = 6;
  const margin = 4;
  const w = n + margin * 2;
  const h = n + margin * 2;
  const bw = w * cellSize;
  const bh = h * cellSize;
  const rowBytes = ((bw + 31) >> 5) << 2;
  const pixelDataSize = rowBytes * bh;
  const paletteSize = 8;
  const dataOffset = 14 + 40 + paletteSize;
  const fileSize = dataOffset + pixelDataSize;

  const buf = Buffer.alloc(fileSize);

  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(dataOffset, 10);

  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(bw, 18);
  buf.writeInt32LE(bh, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(1, 28);
  buf.writeUInt32LE(0, 30);

  buf.writeUInt8(255, 54); buf.writeUInt8(255, 55); buf.writeUInt8(255, 56); buf.writeUInt8(0, 57);
  buf.writeUInt8(0, 58); buf.writeUInt8(0, 59); buf.writeUInt8(0, 60); buf.writeUInt8(0, 61);

  for (let py = 0; py < bh; py++) {
    const moduleY = Math.floor(py / cellSize) - margin;
    for (let px = 0; px < bw; px++) {
      const moduleX = Math.floor(px / cellSize) - margin;
      const isBlack = moduleY >= 0 && moduleY < n && moduleX >= 0 && moduleX < n && matrix[moduleY][moduleX];
      if (isBlack) {
        const row = bh - 1 - py;
        const byteIdx = dataOffset + row * rowBytes + (px >> 3);
        buf[byteIdx] |= 0x80 >> (px & 7);
      }
    }
  }

  return `data:image/bmp;base64,${buf.toString('base64')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  await dbConnect();
  const user = await User.findById(token.sub).select('totpSecret totpEnabled email name').lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const u = user as any;

  if (u.totpEnabled) {
    return res.status(400).json({ error: '2FA is already enabled. Disable it first to regenerate a secret.' });
  }

  const secret = generateSecret();
  const otpauth = generateOTPAuthURL(secret, u.email);
  const matrix = generateQRMatrix(otpauth);
  const qrDataUrl = matrixToBMPDataURL(matrix);
  await User.findByIdAndUpdate(token.sub, { totpSecret: secret });

  return res.status(200).json({ secret, otpauth, qrDataUrl, email: u.email });
}
