// cotebek/src/customers/customers.service.ts
import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, or, ilike, sql, count } from 'drizzle-orm';
import { paginate } from '../common/utils/paginate.util';

@Injectable()
export class CustomersService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async create(appId: string, dto: CreateCustomerDto) {
    // Check duplicate phone per appId
    const existing = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.appId, appId),
          eq(schema.customers.phone, dto.phone),
        ),
      )
      .limit(1);

    if (existing[0]) {
      throw new ConflictException(
        `Customer with phone ${dto.phone} already exists.`,
      );
    }

    const newCustomer = await this.db
      .insert(schema.customers)
      .values({
        appId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        gender: dto.gender,
        birthDate: dto.birthDate,
        addressDetail: dto.addressDetail,
        village: dto.village,
        district: dto.district,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode,
        notes: dto.notes,
        tags: dto.tags ?? [],
      })
      .returning();

    return {
      message: 'Customer successfully added.',
      data: newCustomer[0],
    };
  }

  async findAll(appId: string, query: QueryCustomerDto) {
    const { page = 1, limit = 20, offset, search, city, district, tag } = query;

    const filters = [eq(schema.customers.appId, appId)];

    // Search by name or phone
    if (search) {
      filters.push(
        or(
          ilike(schema.customers.name, `%${search}%`),
          ilike(schema.customers.phone, `%${search}%`),
        ) as any,
      );
    }

    if (city) filters.push(ilike(schema.customers.city, `%${city}%`));
    if (district)
      filters.push(ilike(schema.customers.district, `%${district}%`));

    // Filter by tag — jsonb array contains
    if (tag) {
      filters.push(
        sql`${schema.customers.tags} @> ${JSON.stringify([tag])}::jsonb` as any,
      );
    }

    const [customers, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.customers)
        .where(and(...filters))
        .limit(limit)
        .offset(offset)
        .orderBy(schema.customers.name),

      this.db
        .select({ total: count() })
        .from(schema.customers)
        .where(and(...filters)),
    ]);

    return {
      message: 'Customer list successfully retrieved.',
      ...paginate(customers, Number(total), page, limit),
    };
  }

  async findOne(appId: string, id: string) {
    const customer = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(eq(schema.customers.id, id), eq(schema.customers.appId, appId)),
      )
      .limit(1);

    if (!customer[0]) throw new NotFoundException('Customer not found.');

    // Get order history — last 10
    const orderHistory = await this.db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        totalAmount: schema.orders.totalAmount,
        status: schema.orders.status,
        dueDate: schema.orders.dueDate,
        createdAt: schema.orders.createdAt,
      })
      .from(schema.orders)
      .where(eq(schema.orders.customerId, id))
      .orderBy(sql`${schema.orders.createdAt} DESC`)
      .limit(10);

    return {
      message: 'Customer detail successfully retrieved.',
      data: {
        ...customer[0],
        orderHistory: orderHistory.map((o) => ({
          ...o,
          totalAmount: Number(o.totalAmount),
        })),
      },
    };
  }

  async update(appId: string, id: string, dto: UpdateCustomerDto) {
    // If phone is being updated, check for duplicate
    if (dto.phone) {
      const existing = await this.db
        .select()
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.appId, appId),
            eq(schema.customers.phone, dto.phone),
          ),
        )
        .limit(1);

      if (existing[0] && existing[0].id !== id) {
        throw new ConflictException(
          `Phone ${dto.phone} is already used by another customer.`,
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.birthDate !== undefined) updateData.birthDate = dto.birthDate;
    if (dto.addressDetail !== undefined)
      updateData.addressDetail = dto.addressDetail;
    if (dto.village !== undefined) updateData.village = dto.village;
    if (dto.district !== undefined) updateData.district = dto.district;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.province !== undefined) updateData.province = dto.province;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.tags !== undefined) updateData.tags = dto.tags;

    const updated = await this.db
      .update(schema.customers)
      .set(updateData)
      .where(
        and(eq(schema.customers.id, id), eq(schema.customers.appId, appId)),
      )
      .returning();

    if (!updated[0]) throw new NotFoundException('Customer not found.');

    return { message: 'Customer successfully updated.', data: updated[0] };
  }

  async findByPhone(appId: string, phone: string) {
    const customer = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.appId, appId),
          eq(schema.customers.phone, phone),
        ),
      )
      .limit(1);

    if (!customer[0]) throw new NotFoundException('Customer not found.');

    return { message: 'Customer found.', data: customer[0] };
  }
}
