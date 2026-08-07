const GATEWAY_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== Starting Event & Ticket System Integration Tests ===\n");

  try {
    // 1. Register Admin User
    console.log("1. Registering Admin User...");
    const adminRegRes = await fetch(`${GATEWAY_URL}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Admin User",
        email: "admin@test.com",
        password: "securepassword123",
        role: "admin",
      }),
    });
    const adminReg = await adminRegRes.json();
    console.log("Admin Registration Result:", adminReg);

    // 2. Register Standard User
    console.log("\n2. Registering Standard User...");
    const userRegRes = await fetch(`${GATEWAY_URL}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Regular User",
        email: "user@test.com",
        password: "securepassword123",
        role: "user",
      }),
    });
    const userReg = await userRegRes.json();
    console.log("Standard User Registration Result:", userReg);

    // 3. Login Admin
    console.log("\n3. Logging in Admin User...");
    const adminLoginRes = await fetch(`${GATEWAY_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@test.com",
        password: "securepassword123",
      }),
    });
    const adminLogin = await adminLoginRes.json();
    console.log("Admin Login Result:", adminLogin);
    const adminToken = adminLogin.token;

    // 4. Login Standard User
    console.log("\n4. Logging in Standard User...");
    const userLoginRes = await fetch(`${GATEWAY_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@test.com",
        password: "securepassword123",
      }),
    });
    const userLogin = await userLoginRes.json();
    console.log("Standard User Login Result:", userLogin);
    const userToken = userLogin.token;

    // 5. Create Event (Admin token)
    console.log("\n5. Creating Event as Admin...");
    const createEventRes = await fetch(`${GATEWAY_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Microservices Workshop 2026",
        description: "Hands-on workshop building microservices with Node.js and Docker.",
        date: "2026-10-15T09:00:00Z",
        location: "Virtual - Zoom",
        totalTickets: 5,
        metadata: {
          speaker: "Martin Fowler",
          difficulty: "Intermediate",
        },
      }),
    });
    const createEvent = await createEventRes.json();
    console.log("Create Event Result:", createEvent);
    const eventId = createEvent.data?._id;

    if (!eventId) {
      throw new Error("Failed to retrieve created Event ID from response.");
    }

    // 6. Attempt Event Creation as Standard User (should fail)
    console.log("\n6. Attempting Event Creation as Standard User (Expect 403)...");
    const createEventUserRes = await fetch(`${GATEWAY_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        title: "Hacker Meetup",
        description: "Unofficial meetup for programmers.",
        date: "2026-11-20T18:00:00Z",
        location: "Local Café",
        totalTickets: 10,
      }),
    });
    const createEventUser = await createEventUserRes.json();
    console.log("Create Event (Standard User) Result:", createEventUser);

    // 7. List Events with pagination
    console.log("\n7. Listing Events (Public, page 1, limit 10)...");
    const listEventsRes = await fetch(`${GATEWAY_URL}/events?page=1&limit=10`);
    const listEvents = await listEventsRes.json();
    console.log("List Events Result:", listEvents);

    // 8. Book 2 Tickets as Standard User
    console.log("\n8. Booking 2 Tickets as Standard User...");
    const bookTicketsRes = await fetch(`${GATEWAY_URL}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        eventId,
        tickets: 2,
      }),
    });
    const bookTickets = await bookTicketsRes.json();
    console.log("Booking 2 Tickets Result:", bookTickets);

    // 9. Attempt Booking 4 Tickets (Only 3 left, should fail)
    console.log("\n9. Attempting to Book 4 Tickets when only 3 are left (Expect 400)...");
    const bookTooManyRes = await fetch(`${GATEWAY_URL}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        eventId,
        tickets: 4,
      }),
    });
    const bookTooMany = await bookTooManyRes.json();
    console.log("Booking Too Many Tickets Result:", bookTooMany);

    // 10. Concurrency Challenge: Book remaining 3 tickets concurrently
    // We will launch 5 simultaneous booking requests for 1 ticket each.
    // Since only 3 are left, exactly 3 should succeed and 2 should fail.
    console.log("\n10. Concurrency Challenge: Sending 5 simultaneous booking requests for 1 ticket each...");
    const bookingPromises = [];
    for (let i = 0; i < 5; i++) {
      bookingPromises.push(
        fetch(`${GATEWAY_URL}/bookings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            eventId,
            tickets: 1,
          }),
        }).then((res) => res.json())
      );
    }

    const results = await Promise.all(bookingPromises);
    console.log("Concurrent Booking Results:");
    results.forEach((res, index) => {
      console.log(`Request #${index + 1}: success = ${res.success}, message = ${res.message}`);
    });

    const successCount = results.filter((res) => res.success).length;
    const failCount = results.filter((res) => !res.success).length;
    console.log(`\nSummary of Concurrency Test: Successes: ${successCount}/3 expected, Failures: ${failCount}/2 expected`);

    // 11. View My Tickets
    console.log("\n11. Fetching booked tickets history joined with Event details...");
    const myTicketsRes = await fetch(`${GATEWAY_URL}/bookings/my-tickets`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });
    const myTickets = await myTicketsRes.json();
    console.log("Joined Tickets History Result:", JSON.stringify(myTickets, null, 2));

    console.log("\n=== Integration Tests Completed Successfully! ===");
  } catch (error) {
    console.error("Test execution failed with error:", error);
  }
}

// Give servers a brief moment to warm up before running tests
setTimeout(runTests, 2000);
