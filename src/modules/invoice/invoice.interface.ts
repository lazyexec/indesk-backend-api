export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice {
  id: string;
  clientId: string;
  items: IInvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "pending" | "paid" | "overdue";
  invoiceDate: Date;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateInvoiceRequest {
  clientId: string;
  items: IInvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  invoiceDate: Date;
  dueDate: Date;
}
