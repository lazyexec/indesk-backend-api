export interface IClinicalNote {
  id: string;
  clientId: string;
  authorId: string;
  note: string;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
