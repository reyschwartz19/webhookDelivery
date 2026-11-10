import { createTestUser } from "./users.js"
import { createEndpoint } from "../../src/modules/endpoint/endpoint.service.js"

export const createEventTestFixture = async()=>{
    const user = await createTestUser()

    const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
    )

    return {
        user,
        endpoint,
        apiKey: user.apiKey
    }
}