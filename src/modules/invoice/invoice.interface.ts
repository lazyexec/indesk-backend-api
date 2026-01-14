export interface IInvoice {
  id: string;
  clientId: string;
  appointments: string[];
  totalAmount: number;
  status: "pending" | "paid" | "overdue";
  issueDate: Date;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
