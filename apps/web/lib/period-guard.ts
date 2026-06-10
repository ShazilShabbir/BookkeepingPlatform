import dbConnect from '@/lib/mongoose';
import ClosedPeriod from '@/lib/models/ClosedPeriod';

export async function checkPeriodClosed(userId: string, date: string): Promise<boolean> {
  await dbConnect();
  const yearMonth = date.slice(0, 7);
  const period = await ClosedPeriod.findOne({ userId, yearMonth });
  return !!period;
}
