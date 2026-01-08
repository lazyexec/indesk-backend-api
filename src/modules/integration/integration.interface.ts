import {
  IntegrationType,
  IntegrationStatus,
} from "../../../generated/prisma/client";

export interface IIntegration {
  id: string;
  clinicId: string;
  type: IntegrationType;
  status: IntegrationStatus;
  config: any;
  createdAt: Date;
  updatedAt: Date;
}
