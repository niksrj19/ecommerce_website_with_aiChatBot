import { db } from "../../core/database";
import { CreateAddressInput } from "./address.schema";

export class AddressService {
  /**
   * Retrieves all addresses for a user ordered by primary status first, then newest
   */
  static async getUserAddresses(userId: string) {
    return db.address.findMany({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Creates an address with atomic primary toggling & first-address auto-primary
   */
  static async createAddress(userId: string, input: CreateAddressInput) {
    return db.$transaction(async (tx) => {
      // 1. Check existing address count for the user
      const addressCount = await tx.address.count({
        where: { userId },
      });

      // 2. Rule: If this is the user's first address, force isPrimary = true
      let shouldBePrimary = input.isPrimary;
      if (addressCount === 0) {
        shouldBePrimary = true;
      }

      // 3. Rule: If marked primary, unset isPrimary on all existing addresses
      if (shouldBePrimary) {
        await tx.address.updateMany({
          where: { userId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      // 4. Create and return the new address
      return tx.address.create({
        data: {
          userId,
          firstName: input.firstName,
          lastName: input.lastName,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          pincode: input.pincode,
          state: input.state,
          country: input.country || "India",
          deliveryInstruction: input.deliveryInstruction,
          isPrimary: shouldBePrimary,
        },
      });
    });
  }

  /**
   * Deletes an address and promotes the most recent remaining address if primary was removed
   */
  static async deleteAddress(userId: string, addressId: string) {
    return db.$transaction(async (tx) => {
      // 1. Verify existence and ownership
      const addressToDelete = await tx.address.findFirst({
        where: { id: addressId, userId },
      });

      if (!addressToDelete) {
        const error: any = new Error("Address not found");
        error.statusCode = 404;
        throw error;
      }

      const wasPrimary = addressToDelete.isPrimary;

      // 2. Delete target address
      await tx.address.delete({
        where: { id: addressId },
      });

      // 3. Deletion Fallback: If primary address was deleted, promote newest remaining address
      if (wasPrimary) {
        const newestRemaining = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });

        if (newestRemaining) {
          await tx.address.update({
            where: { id: newestRemaining.id },
            data: { isPrimary: true },
          });
        }
      }

      return { message: "Address deleted successfully" };
    });
  }
}