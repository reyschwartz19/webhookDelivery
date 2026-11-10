import {z} from "zod"

export const publishEventSchema = z.object({
    type: z.string().trim().min(1).max(100),

    payload: z.record(z.string(), z.json()),
});

export type PublishEventInput = z.infer<typeof publishEventSchema>
