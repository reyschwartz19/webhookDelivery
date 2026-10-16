import {z} from "zod"

export const createEndpointSchema = z.object({
    url: z
       .string()
       .url({protocol: /^https$/,
       }),
    events: z
           .array(
              z.string().trim().min(1, "Events name cannot be empty")
            )
            .min(1, "At least one event is required")
           .refine(
            events => new Set(events).size === events.length,
            {message: "Duplicate events aren't allowed"}
           )

})

