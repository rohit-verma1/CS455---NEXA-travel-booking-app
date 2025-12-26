# Payments App Schema 💳

This document outlines the database schema for the **Payments** application within the Django Ticket Booking Platform. It defines the structure for handling transactions, refunds, settlements for providers, and customer loyalty points.

## Table of Contents
1.  [Transaction](#transaction-model)
2.  [Refund](#refund-model)
3.  [Settlement](#settlement-model)
4.  [LoyaltyWallet](#loyaltywallet-model)

---

## **Transaction Model**
Stores a record for every financial transaction related to a booking.

**Model:** `Transaction`

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| `txn_id` | `UUIDField` | **Primary Key.** A unique identifier for the transaction. Automatically generated. |
| `booking` | `ForeignKey` | A required link to the associated `Booking` model. If the booking is deleted, this transaction is protected from deletion (`on_delete=PROTECT`). |
| `customer_user` | `ForeignKey` | A required link to the `User` who made the payment. |
| `provider_user` | `ForeignKey` | A link to the `User` who provided the service. Can be `NULL`. |
| `amount` | `DecimalField` | The monetary value of the transaction. |
| `currency` | `CharField` | The currency code (e.g., "INR"). Defaults to `INR`. |
| `method` | `CharField` | The payment method used (e.g., "Card", "UPI"). |
| `status` | `CharField` | The current state of the transaction. **Choices:** `Initiated`, `Success`, `Failed`, `Refunded`. Defaults to `Initiated`. |
| `transaction_date`| `DateTimeField`| The timestamp when the transaction was created. Automatically set on creation. |

***

## **Refund Model**
Tracks the status and details of refund requests initiated for a transaction.

**Model:** `Refund`

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| `refund_id` | `UUIDField` | **Primary Key.** A unique identifier for the refund request. Automatically generated. |
| `transaction` | `ForeignKey` | A required link to the original `Transaction` being refunded. |
| `processed_by_admin`| `ForeignKey` | A link to the admin `User` who processed the refund. Can be `NULL`. |
| `amount` | `DecimalField` | The amount to be refunded. |
| `reason` | `TextField` | An optional text field explaining the reason for the refund. |
| `status` | `CharField` | The current state of the refund. **Choices:** `Pending`, `Completed`, `Failed`. Defaults to `Pending`. |
| `initiated_at` | `DateTimeField`| The timestamp when the refund was requested. Automatically set on creation. |
| `completed_at` | `DateTimeField`| The timestamp when the refund was completed or failed. Can be `NULL`. |

***

## **Settlement Model**
Represents a financial settlement or payout to a service provider for a specific period.

**Model:** `Settlement`

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| `settlement_id` | `UUIDField` | **Primary Key.** A unique identifier for the settlement. Automatically generated. |
| `provider_user` | `ForeignKey` | A required link to the `User` (provider) receiving the settlement. |
| `period_start` | `DateTimeField`| The start date and time of the settlement period. |
| `period_end` | `DateTimeField` | The end date and time of the settlement period. |
| `amount` | `DecimalField` | The total payout amount to be settled. |
| `currency` | `CharField` | The currency code for the settlement amount. Defaults to `INR`. |
| `status` | `CharField` | The current state of the settlement. **Choices:** `Pending`, `Completed`, `Failed`. Defaults to `Pending`. |
| `processed_at` | `DateTimeField`| The timestamp when the settlement was processed. Can be `NULL`. |

***

## **LoyaltyWallet Model**
Manages loyalty points for each user, which are earned on successful payments.

**Model:** `LoyaltyWallet`

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| `wallet_id` | `UUIDField` | **Primary Key.** A unique identifier for the wallet. Automatically generated. |
| `user` | `OneToOneField` | A required **one-to-one link** to the `User` who owns the wallet. If the user is deleted, their wallet is also deleted (`on_delete=CASCADE`). |
| `balance_points`| `DecimalField`| The current number of loyalty points the user has. Defaults to `0`. |
| `conversion_rate`| `FloatField` | A multiplier used to calculate points earned from a transaction amount. Defaults to `1.0`. |
| `last_updated` | `DateTimeField`| The timestamp when the wallet balance was last updated. Automatically updated on save. |