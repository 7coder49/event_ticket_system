# Event & Ticket System API

A RESTful API for an Event Management System built with a microservices architecture using Node.js, Express, TypeScript, MySQL (relational database), and MongoDB (document database). The system handles high-flexibility data (Event details) and high-integrity transactional data (Ticket bookings) simultaneously while solving critical concurrency challenges.

---

## Architecture Design Decisions

### Microservices Orchestration
The application is structured into four specialized, decoupled services:
- **API Gateway (Port 3000)**: Serves as the single client entry point. It applies global security policies (CORS origin restrictions, Helmet headers, Rate Limiting) and proxies requests to downstream microservices using `http-proxy-middleware`.
- **User Management Service (Port 3001)**: Interacts with MySQL to handle user accounts, password hashing (`bcryptjs`), and token generation (JWT).
- **Event Management Service (Port 3002)**: Connects to MongoDB to manage high-flexibility event listings and metadata.
- **Booking System Service (Port 3003)**: Integrates both MySQL and MongoDB to perform ticket purchases and retrieve user booking histories.

```
       [Client / Postman]
               │
               ▼ (Port 3000)
        ┌──────────────┐
        │ API Gateway  │
        └──────┬───────┘
               │ (Proxy Routing)
      ┌────────┼────────┐
      ▼        ▼        ▼
 ┌────────┐┌────────┐┌────────┐
 │ Users  ││ Events ││Bookings│ (Microservices)
 └────┬───┘└────┬───┘└────┬───┘
      │         │         │
      ▼         │         ▼
  ┌───────┐     │     ┌───────┐
  │ MySQL │◄────┼─────┤ MongoDB│ (Databases)
  └───────┘     ▼     └───────┘
            ┌───────┐
            │MongoDB│
            └───────┘
```

### Dual-Database Consistency & ACID Transactions
- **MySQL** is used for users and booking logs where strict ACID compliance, data integrity, and relational foreign keys are critical.
- **MongoDB** stores event data and nested metadata (such as guest speakers, tags, seating charts, etc.), ensuring optimal document flexibility.
- **Microservice Join**: The Booking Service performs an application-layer join. It fetches booking logs from MySQL, retrieves corresponding event details from MongoDB via an `$in` query, and returns a merged payload. This decouples the service databases and avoids cross-database query latency.

### Concurrency & Race Condition Handling
To prevent ticket overselling (e.g., when two users try to book the last ticket simultaneously), we implement an atomic ticket decrement pattern in MongoDB combined with a MySQL transaction:
1. **MySQL Transaction**: Start a transaction and insert a booking record.
2. **Atomic MongoDB Decrement**: Update the event document atomically using the filter condition `totalTickets: { $gte: tickets }` and decrement operation `$inc: { totalTickets: -tickets }`.
3. **Rollback/Commit Check**:
   - If the MongoDB update returns `null` (indicating no document matched the filter because the tickets were sold out), we immediately rollback the MySQL transaction and return a "Sold out or insufficient tickets" error.
   - If the update succeeds, we commit the MySQL transaction.
This atomic check is concurrency-safe and does not require complex distributed lock systems (like Redis Redlock) or heavy database-level locking, maximizing system throughput.

---

## Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MySQL Server](https://www.mysql.com/) (running on localhost:3306)
- [MongoDB Server](https://www.mongodb.com/) (running on localhost:27017)

### 1. Initialize MySQL Database
Run the schema setup script `db_init.sql` using your MySQL command line client:
```bash
mysql -u root -p < db_init.sql
```
*By default, the script creates a database named `booking_system` and tables for `users` and `bookings`.*

### 2. Configure Environment Variables
Verify or edit the `.env` files in each service subdirectory. Standard default values are configured for local setup:
- Gateway: [src/gateway/.env](file:///c:/playground/event_ticket_system/src/gateway/.env)
- User Management: [src/userManagement/.env](file:///c:/playground/event_ticket_system/src/userManagement/.env)
- Event Management: [src/eventManagement/.env](file:///c:/playground/event_ticket_system/src/eventManagement/.env)
- Booking System: [src/bookingSystem/.env](file:///c:/playground/event_ticket_system/src/bookingSystem/.env)

### 3. Install Dependencies
Install the required packages in each service folder:
```bash
cd src/gateway && npm install
cd ../userManagement && npm install
cd ../eventManagement && npm install
cd ../bookingSystem && npm install
```

### 4. Run the Servers
Start all services in development mode (using tsx watch). Open four terminals or run them in the background:
```bash
# In src/gateway
npm run dev

# In src/userManagement
npm run dev

# In src/eventManagement
npm run dev

# In src/bookingSystem
npm run dev
```

---

## API Endpoints Documentation

All requests should be routed through the API Gateway at `http://localhost:3000`.

### User Management
| Endpoint | Method | Auth | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/users/register` | `POST` | Public | `{ name, email, password, role? }` | Register a new user. Role can be `'user'` (default) or `'admin'`. |
| `/users/login` | `POST` | Public | `{ email, password }` | Authenticate credentials and receive a signed JWT. |

### Event Management
| Endpoint | Method | Auth | Request/Query Params | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/events` | `POST` | Admin Only | `{ title, description, date, location, totalTickets, metadata? }` | Create a new event. |
| `/events` | `GET` | Public | `?page=1&limit=10` (Query params) | List all events with pagination metadata. |

### Booking System
| Endpoint | Method | Auth | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/bookings` | `POST` | User Only | `{ eventId, tickets? }` | Book tickets for an event. Validates availability and decrements count atomically. |
| `/bookings/my-tickets` | `GET` | User Only | None | Get a list of the user's bookings joined with MongoDB event names, dates, and locations. |

---

## Running Integration Tests
A complete automated test script is provided in [test.js](file:///c:/playground/event_ticket_system/test.js). To run the test suite, ensure your MySQL and MongoDB servers are running, start all four Node.js services, and run:
```bash
node test.js
```
The test suite performs the following assertions:
1. Registers an Admin and a Standard User.
2. Logs in both users and acquires JWTs.
3. Successfully creates an event (Admin token).
4. Asserts that creating an event with a standard user token is blocked (403).
5. Publicly lists events.
6. Books tickets and tests limit checking (trying to book more tickets than available).
7. **Concurrency Test**: Fires 5 concurrent requests for 1 ticket each on an event with only 3 tickets left, asserting that exactly 3 bookings succeed and 2 are blocked.
8. Fetches ticket history, asserting that MySQL records are successfully joined with MongoDB event names.
