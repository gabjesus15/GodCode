import { z } from "zod";

export const tenantBroadcastAckSchema = z.object({
	broadcastId: z.string().trim().min(1, "Falta broadcastId"),
});
