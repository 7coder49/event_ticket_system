# Installation & Setup

### 1. Database Setup
Ensure MySQL and MongoDB are running locally, then initialize the MySQL database:
```bash
mysql -u root -p < db_init.sql
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
