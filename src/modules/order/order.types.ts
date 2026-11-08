export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
}

export interface OrderEmailDetails {
  orderId: string;
  userEmail: string;
  totalAmount: number;
  items: {
    title: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
  }[];
}