export type * from './auth';
export type * from './navigation';
export type * from './ui';

export interface Category {
    id: number;
    name: string;
    description: string | null;
    sort_order: number;
}

export interface CategoryWithProductCount extends Category {
    products_count: number;
}

export interface Product {
    id: number;
    category_id: number;
    name: string;
    description: string | null;
    price: number;
    image: string | null;
    image_url: string | null;
    is_active: boolean;
    is_available: boolean;
    sort_order: number;
    category: Category;
}

export interface PosCategory {
    id: number;
    name: string;
    sort_order: number;
    products_count: number;
}

export interface PosProduct {
    id: number;
    category_id: number;
    name: string;
    price: number;
    image_url: string | null;
    sort_order: number;
    category: {
        id: number;
        name: string;
    };
}

export type OrderStatus = 'open' | 'paid' | 'void';
export type OrderType = 'dine_in' | 'take_away';
export type PaymentMethod = 'cash' | 'qris' | 'transfer';

export interface OrderListItem {
    id: number;
    queue_number: string;
    invoice_number: string;
    customer_name: string | null;
    order_type: OrderType;
    payment_method: PaymentMethod | null;
    grand_total: number;
    status: OrderStatus;
    created_at: string | null;
    cashier: {
        id: number;
        name: string;
    };
}

export interface OrderItem {
    id: number;
    product_id: number | null;
    product_name: string;
    price: number;
    qty: number;
    subtotal: number;
    note: string | null;
}

export interface OrderDetail extends OrderListItem {
    subtotal: number;
    paid_amount: number;
    change_amount: number;
    paid_at: string | null;
    voided_at: string | null;
    void_reason: string | null;
    receipt_url: string;
    items: OrderItem[];
}

export interface OrderSuccess {
    id: number;
    invoice_number: string;
    queue_number: string;
    status: OrderStatus;
    grand_total: number;
    receipt_url: string;
}

export interface DashboardStats {
    revenue: number;
    paid_transactions: number;
    open_orders: number;
    paid_orders: number;
    void_orders: number;
}

export interface PaymentBreakdownItem {
    count: number;
    total: number;
}

export type PaymentBreakdown = Record<PaymentMethod, PaymentBreakdownItem>;

export interface StoreSetting {
    id: number;
    store_name: string;
    address: string | null;
    phone: string | null;
    receipt_footer: string | null;
    logo: string | null;
    logo_url: string | null;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
}
