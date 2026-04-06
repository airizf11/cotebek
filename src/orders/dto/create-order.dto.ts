// cotebek/src/orders/dto/create-order.dto.ts
export class CreateOrderDto {
  orderNumber: string; // Misal: ORD-001
  totalAmount: number; // Harga jual total
  totalCogs: number;   // Modal/HPP total
  paymentMethod: string;
  metadata?: any;      // Catatan opsional (JSON)

  // Array/Daftar barang yang dibeli
  items: {
    itemName: string;
    qty: number;
    price: number;
    cogs: number;
    subtotal: number;
    metadata?: any;
  }[];
}