export interface AddressResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string | null;
  addressLine1: string;
  addressLine2: string | null;
  pincode: string;
  state: string;
  country: string;
  deliveryInstruction: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}