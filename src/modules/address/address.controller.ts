import { Request, Response } from "express";
import { ZodError } from "zod";
import { AddressService } from "./address.service";
import {
  createAddressSchema,
  addressIdParamSchema,
} from "./address.schema";

export class AddressController {
  // GET /api/addresses
  static async listAddresses(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: "User not loggedIn" });
        return;
      }

      const addresses = await AddressService.getUserAddresses(req.user.userId);
      res.status(200).json(addresses);
    } catch (error: any) {
      AddressController.handleError(error, res, "Failed to retrieve addresses");
    }
  }

  // POST /api/addresses
  static async createAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: "User not loggedIn" });
        return;
      }

      const validatedBody = createAddressSchema.parse(req.body);
      const newAddress = await AddressService.createAddress(
        req.user.userId,
        validatedBody
      );

      res.status(201).json(newAddress);
    } catch (error: any) {
      AddressController.handleError(error, res, "Failed to create address");
    }
  }

  // DELETE /api/addresses/:addressId
  static async deleteAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: "User not loggedIn" });
        return;
      }

      const { addressId } = addressIdParamSchema.parse(req.params);
      const result = await AddressService.deleteAddress(
        req.user.userId,
        addressId
      );

      res.status(200).json(result);
    } catch (error: any) {
      AddressController.handleError(error, res, "Failed to delete address");
    }
  }

  private static handleError(error: any, res: Response, defaultMessage: string): void {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Validation Failed",
        details: error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }

    if (error.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error(`${defaultMessage}:`, error);
    res.status(500).json({ error: defaultMessage });
  }
}