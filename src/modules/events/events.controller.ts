import { Request, Response } from "express";
import { publishEvent } from "./events.service.js";
import { publishEventSchema } from "./events.schema.js";

export const publishEventController = async (
    req: Request,
    res: Response
) => {
    const userId = req.user!.userId
    const input = publishEventSchema.parse(req.body)
    const result = publishEvent(userId, input)
    res.status(201).json(result)
}