import { Router } from "express";
import { AddressController } from "./address.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

// Protect all address routes with authentication
router.use(authenticate);

router.get("/", AddressController.listAddresses);
router.post("/", AddressController.createAddress);
router.delete("/:addressId", AddressController.deleteAddress);

export const addressRoutes = router;