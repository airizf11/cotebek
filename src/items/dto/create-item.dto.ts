// cotebek/src/items/dto/create-item.dto.ts
export class CreateItemDto {
  name: string;        // Wajib (ex: 'Kopi Susu Aren')
  sku?: string;        // Opsional (Kode barang, ex: 'KSA-01')
  price: number;       // Wajib (Harga jual)
  cogs?: number;       // Opsional (Modal / HPP)
  category?: string;   // Opsional (Kategori, ex: 'Minuman')
}