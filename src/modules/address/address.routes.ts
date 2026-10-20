import { Router } from "express";
import { AddressController } from "./address.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

const router = Router();

// Protect all address routes with authentication
router.use(authenticate);

router.get("/", AddressController.listAddresses);
router.post("/", AddressController.createAddress);
router.delete("/:addressId", AddressController.deleteAddress);

export const addressRoutes = router;