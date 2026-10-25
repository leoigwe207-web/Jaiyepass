export interface TicketTypeOption {
  id: string;
  name: string;
  description: string | null;
  priceKobo: number;
  remaining: number;
  perOrderLimit: number;
}
