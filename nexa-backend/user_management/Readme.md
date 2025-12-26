# User Management App

## Overview

This Django app provides a robust backend system for managing user profiles within a larger application. It defines different user roles (Customer, Service Provider, Admin) and offers a RESTful API for performing CRUD (Create, Read, Update, Delete) operations on their respective data.

The core functionality is built using the Django Rest Framework.

## Core Features

* **Multi-Role User Profiles**: Extends Django's base User model to support distinct profiles for Customers, Service Providers, and Admins.
* **Profile Management**: Endpoints for users to manage their own profile information.
* **Co-Traveller Management**: Allows customers to add and manage associated co-travellers.
* **Admin Oversight**: Admins have the ability to view and manage all user profiles.
* **Permission-Based Access**: API access is controlled based on user authentication and role.

## Models

The application's data structure is defined by the following models:

* **`Customer`**: A one-to-one extension of the base `User` model. It stores personal details for a customer, such as nationality, date of birth, contact information, and preferences.
* **`CoTraveller`**: Associated with a `Customer` via a foreign key. It stores information about a person travelling with the customer.
* **`ServiceProvider`**: A one-to-one extension of the base `User` model for service provider accounts. It includes fields for company name, license information, and verification status (`Pending`, `Approved`, `Rejected`).
* **`AdminUser`**: A one-to-one extension of the base `User` model for administrators, with specific fields like `mfa_enabled`.

## API Endpoints

The app exposes the following viewsets to interact with the models. All endpoints require authentication.

| Endpoint | ViewSet | Supported Methods | Description |
| :--- | :--- | :--- | :--- |
| `/api/customers/` | `CustomerViewSet` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | Manages customer profiles. Customers can only manage their own profile. Admins can manage all profiles. |
| `/api/cotravellers/` | `CoTravellerViewSet` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | Manages co-travellers. Customers can only manage their own co-travellers. Admins can manage all. |
| `/api/serviceproviders/` | `ServiceProviderViewSet` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | Manages service provider profiles. Providers can only manage their own. Admins can manage all. |

## Permissions

Access control is handled by custom permission classes that check the `user_type` attribute on the `User` model.

* **`IsUserType`**: A base class that verifies if a logged-in user's type is in an `allowed_user_types` list.
* **`IsAdmin`**: Allows access only to users with `user_type = 'admin'`.
* **`IsServiceProvider`**: Allows access only to users with `user_type = 'provider'`.
* **`IsCustomer`**: Allows access only to users with `user_type = 'customer'`.

Currently, the viewsets implement permission logic directly within the `get_queryset` method to filter results based on the user's role, ensuring users can only see their own data unless they are an admin.

## Getting Started

### Prerequisites

* Python 3.8+
* Django 4.x
* Django Rest Framework

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Apply migrations:**
    *Note: This app depends on a custom User model from an app named `authapi`. Ensure its migrations are run first.*
    ```bash
    python manage.py migrate
    ```

4.  **Run the development server:**
    ```bash
    python manage.py runserver
    ```

## Project Structure

This README describes the app containing the following key files:

* `models.py`: Defines the database schema for user profiles.
* `views.py`: Contains the API logic using Django Rest Framework's `ModelViewSet`.
* `serializers.py`: Defines the API representation of the models.
* `permissions.py`: Contains custom permission classes for role-based access control.
* `urls.py` (not provided): This file would be required to route the viewsets to the API endpoints.