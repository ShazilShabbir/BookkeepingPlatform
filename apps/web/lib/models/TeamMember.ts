import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamMember extends Document {
  adminId: string;
  memberId?: string;
  email: string;
  name: string;
  role: 'viewer' | 'editor';
  status: 'invited' | 'active';
  inviteToken: string;
  invitedAt: Date;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>({
  adminId: { type: String, required: true, index: true },
  memberId: { type: String, default: null },
  email: { type: String, required: true },
  name: { type: String, default: '' },
  role: { type: String, default: 'viewer', enum: ['viewer', 'editor'] },
  status: { type: String, default: 'invited', enum: ['invited', 'active'] },
  inviteToken: { type: String, required: true },
  invitedAt: { type: Date, default: Date.now },
  joinedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

TeamMemberSchema.index({ adminId: 1, email: 1 }, { unique: true });
TeamMemberSchema.index({ inviteToken: 1 });
TeamMemberSchema.index({ memberId: 1 });

TeamMemberSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.TeamMember || mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);
