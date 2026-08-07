# Installation & Setup

Node version: 24.16.0

### 1. Database Setup
Ensure MySQL and MongoDB are running locally, then import the database backups:

**Import MySQL Backup**:
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS booking_system;"
mysql -u root -p booking_system < booking_system_backup.sql
```

**Import MongoDB Backup**:
```bash
mongoimport --db event_management --collection event_management --file event_management_backup.json --jsonArray
```

### 2. Install Dependencies
Install packages in all service directories:
```bash
cd src/gateway && npm install
cd ../userManagement && npm install
cd ../eventManagement && npm install
cd ../bookingSystem && npm install
```

### 3. Run Services
Run `npm run dev` in each of the four directories (preferably in separate terminal windows):
* `src/gateway`
* `src/userManagement`
* `src/eventManagement`
* `src/bookingSystem`

### 4. Run Integration Tests
```bash
node test.js
```

### 5. Database Backup & Dumps
To export MySQL and MongoDB database dumps:

**MySQL Dump**:
```bash
mysqldump -u root -p booking_system > mysql_dump.sql
```

**MongoDB Dump**:
```bash
mongodump --db=event_management --out=./mongo_dump
```

---

## API Endpoints
All requests route through the API Gateway at `http://localhost:3000`. The interactive OpenAPI Swagger UI documentation is available at `http://localhost:3000/api-docs`.
* **POST** `/users/register` - Register a new user account.
* **POST** `/users/login` - Authenticate and receive a JWT.
* **POST** `/events` - Create a new event (Admin only).
* **GET** `/events` - Publicly list all events with pagination.
* **POST** `/bookings` - Book event tickets (User only).
* **GET** `/bookings/my-tickets` - Retrieve booking history (User only).

## Design Decisions
This application is structured as a **decoupled microservices architecture** with a single **API Gateway** managing global policies (cors, rate limits, headers). Within each downstream service, we separated the route handling layers (controllers) from database transactions, business logic, and joins (services). This clean separation ensures high maintainability, isolated domain scaling, and easier testing.

### Tech Stack & Service Ports
* **API Gateway** (Port `3000`): Core entry point routing all client traffic via proxy middleware.
* **User Management** (Port `3001`): Interacts with MySQL (`booking_system`) to handle user registration, logins, and authentication tokens (JWT).
* **Event Management** (Port `3002`): Connects to MongoDB (`event_management`) to store highly flexible event records.
* **Booking System** (Port `3003`): Interacts with both MySQL and MongoDB to record purchases and fetch booking history (via application-layer joins).

### Concurrency & Overselling Prevention
To safely prevent double-booking or overselling when multiple users try to book the last available ticket:
1. **MySQL Transaction**: Start a transaction and insert a tentative booking record.
2. **Atomic MongoDB Decrement**: Attempt to atomically decrement the event's tickets using a filter checking that enough tickets remain:
   ```typescript
   Event.findOneAndUpdate(
     { _id: eventId, totalTickets: { $gte: tickets } },
     { $inc: { totalTickets: -tickets } }
   )
   ```
3. **Rollback or Commit**:
   - If MongoDB returns `null` (sold out), the MySQL transaction rolls back.
   - If it succeeds, the transaction is committed, guaranteeing race-condition safety.
