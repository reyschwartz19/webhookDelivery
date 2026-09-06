# Product Requirements

## User

Backend developers who need to send events to external applications reliably.

## Problem

Developers need to deliver events to external applications reliably, but often have to build queues, retries, logging, and failure handling themselves.

## V1

* Register a webhook destination URL
* Accept events through an API
* Queue webhook deliveries
* Deliver events to registered destinations
* Retry failed deliveries
* Send email alerts for repeated or terminal failures
* View delivery attempts and history

## Not V1 / Future Versions

* Teams and organizations
* Billing
* Advanced analytics
* SDKs
* MCP integration
