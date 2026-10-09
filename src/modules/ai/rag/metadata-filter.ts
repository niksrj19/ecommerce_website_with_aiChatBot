import { Role } from "@prisma/client";

export class MetadataFilter {
  static getRoleClearanceFilter(userRole: string = "USER"): Role[] {
    if (userRole === "ADMIN") return [Role.USER, Role.MANAGER, Role.ADMIN];
    if (userRole === "MANAGER") return [Role.USER, Role.MANAGER];
    return [Role.USER];
  }
}