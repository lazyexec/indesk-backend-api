export interface ITransaction {
  sessionId: string;
  clientId: string;
  transactionId?: string;
  amount?: number;
  type?: "payment" | "refund";
  method?: "stripe";
  status?: "pending" | "completed" | "failed";
  description?: string | null;
  meta?: Object | null;
}
